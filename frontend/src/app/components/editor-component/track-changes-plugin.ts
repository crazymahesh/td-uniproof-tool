import { Plugin, PluginKey, EditorState, TextSelection } from 'prosemirror-state';
import { Schema } from 'prosemirror-model';
import { TrackChangesService, TrackChange } from '../../services/track-changes.service';

export const trackChangesPluginKey = new PluginKey('track-changes');

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Collapse adjacent same-type, same-author entries into one.
 * This turns per-character entries (H, e, l, l, o) into a single word entry.
 */
function mergeAdjacent(items: TrackChange[]): TrackChange[] {
  items.sort((a, b) => a.from - b.from);
  const result: TrackChange[] = [];
  for (const item of items) {
    const last = result[result.length - 1];
    if (last && last.type === item.type && last.author === item.author && last.to === item.from) {
      last.content += item.content;
      last.to = item.to;
    } else {
      result.push({ ...item });
    }
  }
  return result;
}

/**
 * Walk the document once and collect all tracked changes.
 * Adjacent marks from the same author are merged into a single entry.
 * Paired insert+delete with the same groupId become a "modification".
 */
function collectChanges(state: EditorState): TrackChange[] {
  const groupedIns = new Map<string, TrackChange>();
  const groupedDel = new Map<string, TrackChange>();
  const rawIns: TrackChange[] = [];
  const rawDel: TrackChange[] = [];

  state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name !== 'insertion' && mark.type.name !== 'deletion') continue;

      const id        = mark.attrs['id']        || generateId();
      const author    = mark.attrs['author']    || 'Unknown Author';
      const rawTs     = mark.attrs['timestamp'] || '';
      const timestamp = rawTs ? new Date(rawTs) : new Date();
      const groupId: string | null = mark.attrs['groupId'] || null;
      const content   = node.text || '';
      const from      = pos;
      const to        = pos + node.nodeSize;
      const type      = mark.type.name as 'insertion' | 'deletion';
      const entry: TrackChange = { id, type, content, from, to, author, timestamp, nodeType: 'text', ...(groupId ? { groupId } : {}) };

      if (type === 'insertion') {
        if (groupId) {
          const ex = groupedIns.get(groupId);
          if (ex) { ex.content += content; ex.to = to; } else groupedIns.set(groupId, entry);
        } else rawIns.push(entry);
      } else {
        if (groupId) {
          const ex = groupedDel.get(groupId);
          if (ex) { ex.content += content; ex.to = to; } else groupedDel.set(groupId, entry);
        } else rawDel.push(entry);
      }
    }
  });

  const changes: TrackChange[] = [];

  // Pair grouped ins + del with the same groupId → modification
  for (const [gid, ins] of groupedIns) {
    const del = groupedDel.get(gid);
    if (del) {
      changes.push({
        id: ins.id, type: 'modification',
        content: ins.content, oldContent: del.content,
        from: Math.min(ins.from, del.from), to: Math.max(ins.to, del.to),
        author: ins.author, timestamp: ins.timestamp, groupId: gid, nodeType: 'text',
      });
      groupedDel.delete(gid);
    } else {
      changes.push(ins);
    }
  }
  for (const del of groupedDel.values()) changes.push(del);

  // Merge adjacent standalone insertions / deletions
  changes.push(...mergeAdjacent(rawIns));
  changes.push(...mergeAdjacent(rawDel));
  changes.sort((a, b) => a.from - b.from);
  return changes;
}

export function trackChangesPlugin(
  schema: Schema,
  trackChangesService: TrackChangesService,
  getAuthor: () => string,
): Plugin {
  // Debounce: wait until the user stops typing before refreshing the sidebar.
  // 1 500 ms gives time for a full word / phrase to be typed before the list updates.
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleUpdate = (state: EditorState) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      trackChangesService.updateChanges(collectChanges(state));
    }, 1500);
  };

  return new Plugin({
    key: trackChangesPluginKey,

    appendTransaction(transactions, _oldState, newState) {
      if (transactions.some(tr => tr.docChanged)) {
        scheduleUpdate(newState);
      }
      return null;
    },

    props: {
      // ── Backspace / Delete ─────────────────────────────────────────────────
      handleKeyDown(view, event) {
        if (!trackChangesService.isEnabled()) return false;
        if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

        const { state, dispatch } = view;
        const { selection } = state;
        let from = selection.from;
        let to   = selection.to;
        // Where the cursor should land after the mark so the next keypress
        // targets the NEXT character, not the same one again.
        let newCursor = from;

        if (selection.empty) {
          if (event.key === 'Backspace') {
            if (from <= 1) return false;
            from      = from - 1;
            newCursor = from;       // move cursor back one position
          } else {                  // Delete
            if (to >= state.doc.content.size) return false;
            to        = to + 1;
            newCursor = from;       // cursor stays; next char is now at `from`
          }
        } else {
          // Non-empty selection: collapse cursor to the start after marking
          newCursor = from;
        }

        // Skip entirely if the range contains no text (e.g. cursor on block boundary)
        let hasText = false;
        state.doc.nodesBetween(from, to, node => { if (node.isText) hasText = true; });
        if (!hasText) return false;

        const deletionMark = schema.marks['deletion'].create({
          id: generateId(), author: getAuthor(), timestamp: new Date().toISOString(),
        });

        const tr = state.tr.addMark(from, to, deletionMark);
        // *** Move the cursor so the next keypress targets the next character ***
        tr.setSelection(TextSelection.create(tr.doc, newCursor));
        tr.setMeta('track-changes-skip', true);
        dispatch(tr);
        return true; // prevent the actual character removal
      },

      // ── Typed text (insertion / replacement) ──────────────────────────────
      handleTextInput(view, from, to, text) {
        if (!trackChangesService.isEnabled()) return false;

        const { state, dispatch } = view;
        const author    = getAuthor();
        const timestamp = new Date().toISOString();

        if (from === to) {
          // Plain insertion at the cursor
          const insertionMark = schema.marks['insertion'].create({ id: generateId(), author, timestamp });
          const tr = state.tr.insertText(text, from);
          tr.addMark(from, from + text.length, insertionMark);
          tr.setMeta('track-changes-skip', true);
          dispatch(tr);
          return true;
        } else {
          // Text replacement (user selected text then typed):
          // – keep old text in place with a deletion mark
          // – prepend new text with an insertion mark
          // – link them via a shared groupId → shown as "Modification"
          const groupId       = generateId();
          const insertionMark = schema.marks['insertion'].create({ id: generateId(), author, timestamp, groupId });
          const deletionMark  = schema.marks['deletion'].create({  id: generateId(), author, timestamp, groupId });

          const tr = state.tr;
          tr.insertText(text, from);                                    // insert new text at `from`
          tr.addMark(from, from + text.length, insertionMark);          // mark new text
          tr.addMark(from + text.length, to + text.length, deletionMark); // mark old text (now shifted)
          tr.setMeta('track-changes-skip', true);
          dispatch(tr);
          return true;
        }
      },
    },
  });
}
