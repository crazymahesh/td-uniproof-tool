import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface QueryReply {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
}

export interface Query {
  id: string;
  text: string;
  selectedText: string;
  from: number;
  to: number;
  author: string;
  timestamp: Date;
  replies: QueryReply[];
}

export interface PendingQuerySelection {
  from: number;
  to: number;
  selectedText: string;
}

@Injectable({ providedIn: 'root' })
export class QueryService {
  private showQueryFormSource = new Subject<PendingQuerySelection>();
  showQueryForm$ = this.showQueryFormSource.asObservable();

  private queriesSource = new BehaviorSubject<Query[]>([]);
  queries$ = this.queriesSource.asObservable();

  private pendingSelection: PendingQuerySelection | null = null;

  triggerAddQuery(from: number, to: number, selectedText: string): void {
    this.pendingSelection = { from, to, selectedText };
    this.showQueryFormSource.next(this.pendingSelection);
  }

  getPendingSelection(): PendingQuerySelection | null {
    return this.pendingSelection;
  }

  addQuery(text: string, author: string): Query | null {
    const sel = this.pendingSelection;
    if (!sel) return null;

    const query: Query = {
      id: Date.now().toString(),
      text,
      selectedText: sel.selectedText,
      from: sel.from,
      to: sel.to,
      author,
      timestamp: new Date(),
      replies: [],
    };

    this.queriesSource.next([...this.queriesSource.value, query]);
    this.pendingSelection = null;
    return query;
  }

  addReply(queryId: string, text: string, author: string): void {
    const queries = this.queriesSource.value.map(q => {
      if (q.id !== queryId) return q;
      const reply: QueryReply = {
        id: `${queryId}-${Date.now()}`,
        text,
        author,
        timestamp: new Date(),
      };
      return { ...q, replies: [...q.replies, reply] };
    });
    this.queriesSource.next(queries);
  }

  getQueries(): Query[] {
    return this.queriesSource.value;
  }
}
