import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TrackChange {
  id: string;
  type: 'insertion' | 'deletion' | 'modification';
  content: string;       // new text (or deleted text for pure deletions)
  oldContent?: string;   // original text replaced (for modifications)
  from: number;
  to: number;
  author: string;
  timestamp: Date;
  groupId?: string;      // links paired insertion+deletion (modification)
  nodeType?: string;     // 'text' | 'figure' | 'table'
}

@Injectable({ providedIn: 'root' })
export class TrackChangesService {
  private enabledSource = new BehaviorSubject<boolean>(true); // enabled by default
  private changesSource = new BehaviorSubject<TrackChange[]>([]);

  enabled$ = this.enabledSource.asObservable();
  changes$ = this.changesSource.asObservable();

  toggle(): void {
    this.enabledSource.next(!this.enabledSource.value);
  }

  isEnabled(): boolean {
    return this.enabledSource.value;
  }

  updateChanges(changes: TrackChange[]): void {
    this.changesSource.next(changes);
  }

  getChanges(): TrackChange[] {
    return this.changesSource.value;
  }
}
