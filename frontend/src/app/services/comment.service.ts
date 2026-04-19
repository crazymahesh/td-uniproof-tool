import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface Comment {
  id: string;
  text: string;
  selectedText: string;
  from: number;
  to: number;
  author: string;
  timestamp: Date;
}

export interface PendingSelection {
  from: number;
  to: number;
  selectedText: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private showCommentFormSource = new Subject<PendingSelection>();
  showCommentForm$ = this.showCommentFormSource.asObservable();

  private commentsSource = new BehaviorSubject<Comment[]>([]);
  comments$ = this.commentsSource.asObservable();

  private pendingSelection: PendingSelection | null = null;

  triggerAddComment(from: number, to: number, selectedText: string): void {
    this.pendingSelection = { from, to, selectedText };
    this.showCommentFormSource.next(this.pendingSelection);
  }

  getPendingSelection(): PendingSelection | null {
    return this.pendingSelection;
  }

  addComment(text: string, author: string): Comment | null {
    const sel = this.pendingSelection;
    if (!sel) return null;

    const comment: Comment = {
      id: Date.now().toString(),
      text,
      selectedText: sel.selectedText,
      from: sel.from,
      to: sel.to,
      author,
      timestamp: new Date(),
    };

    this.commentsSource.next([...this.commentsSource.value, comment]);
    this.pendingSelection = null;
    return comment;
  }

  getComments(): Comment[] {
    return this.commentsSource.value;
  }
}
