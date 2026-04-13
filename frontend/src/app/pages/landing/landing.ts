import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, HostListener, OnInit,inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { APP_CONSTANTS } from '../../app.constants';
import { UserService } from '../../services/user.service';
import { CommonServices } from '../../services/common-services';
interface Chapter {
  chapterNo: number;
  title: string;
  author: string;
  submittedDate: string;
  status: 'In-Progress' | 'Yet-to-Start' | 'Completed';
  statusClass: string;
}

@Component({
  standalone: true,
  selector: 'app-landing',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './landing.html',
  styleUrls:  ['./landing.css'],
})
export class Landing implements OnInit {
  allChapters: Chapter[] = [
    { chapterNo: 1, title: 'The Beginning', author: 'Mahesh Amirthalingam', submittedDate: '14 Feb 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 2, title: 'Advanced Concepts', author: 'Jane Doe', submittedDate: '10 Feb 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 3, title: 'Case Studies', author: 'John Smith', submittedDate: '08 Feb 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 4, title: 'Future Trends', author: 'Sarah Lee', submittedDate: '12 Feb 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 5, title: 'Machine Learning Basics', author: 'David Chen', submittedDate: '05 Feb 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 6, title: 'Deep Learning Networks', author: 'Emily Brown', submittedDate: '09 Feb 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 7, title: 'Natural Language Processing', author: 'Michael Johnson', submittedDate: '11 Feb 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 8, title: 'Computer Vision', author: 'Lisa Wang', submittedDate: '13 Feb 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 9, title: 'Reinforcement Learning', author: 'Robert Taylor', submittedDate: '07 Feb 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 10, title: 'Neural Architecture Search', author: 'Amanda Martinez', submittedDate: '06 Feb 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 11, title: 'Transfer Learning', author: 'Chris Anderson', submittedDate: '04 Feb 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 12, title: 'Generative Adversarial Networks', author: 'Jennifer Wilson', submittedDate: '03 Feb 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 13, title: 'Attention Mechanisms', author: 'Kevin Moore', submittedDate: '02 Feb 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 14, title: 'Transformer Models', author: 'Rachel Green', submittedDate: '01 Feb 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 15, title: 'Auto-Encoders', author: 'Daniel White', submittedDate: '31 Jan 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 16, title: 'Recurrent Neural Networks', author: 'Sophie Turner', submittedDate: '30 Jan 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 17, title: 'Convolutional Networks', author: 'James Clark', submittedDate: '29 Jan 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 18, title: 'Optimization Techniques', author: 'Olivia Harris', submittedDate: '28 Jan 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 19, title: 'Regularization Methods', author: 'William Lewis', submittedDate: '27 Jan 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 20, title: 'Batch Normalization', author: 'Emma Robinson', submittedDate: '26 Jan 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 21, title: 'Dropout Techniques', author: 'Alexander Walker', submittedDate: '25 Jan 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 22, title: 'Gradient Descent Variants', author: 'Mia Hall', submittedDate: '24 Jan 2026', status: 'Yet-to-Start', statusClass: 'bg-secondary' },
    { chapterNo: 23, title: 'Loss Functions', author: 'Ethan Allen', submittedDate: '23 Jan 2026', status: 'Completed', statusClass: 'bg-success' },
    { chapterNo: 24, title: 'Activation Functions', author: 'Ava Young', submittedDate: '22 Jan 2026', status: 'In-Progress', statusClass: 'bg-warning text-dark' },
    { chapterNo: 25, title: 'Model Evaluation Metrics', author: 'Noah King', submittedDate: '21 Jan 2026', status: 'Completed', statusClass: 'bg-success' },
  ];

  displayedChapters: Chapter[] = [];
  filteredChapters: Chapter[] = [];
  searchTerm: string = '';
  selectedStatus: string = '';

  // Sidebar tab state
  activeTab: string = 'current';

  // All-chapters pagination
  allChaptersPage: number = 1;
  readonly allChaptersPageSize: number = 8;

  get pagedChapters(): Chapter[] {
    const start = (this.allChaptersPage - 1) * this.allChaptersPageSize;
    return this.filteredChapters.slice(start, start + this.allChaptersPageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredChapters.length / this.allChaptersPageSize));
  }

  private itemsPerPage = 8;
  private currentPage = 1;
  private isLoading = false;
  private commonServices = inject(CommonServices);
  userInfo: any = null;
  curretDocLst: any = null;
  constructor(private http: HttpClient, private userService: UserService) {
    this.userService.user$.subscribe((res: any) => {
      if (!res || Object.keys(res).length === 0) {
        console.warn('[Landing] Received empty user info:', res);
        this.userInfo = null; 
        return;
      }
      this.userInfo = res.payload || res;
      console.log('[Landing] User info updated:', this.userInfo);
    });
  }
  getCurrentDocument() {
    this.commonServices.getCurrentDocument().subscribe(
      (response:any) => {
        
        this.curretDocLst = response.payload || response;
      },
      (error:any) => {
        console.error('Failed to fetch current document info:', error);
      }
    );
  }
  ngOnInit(): void {
    this.getCurrentDocument();
    this.filteredChapters = [...this.allChapters];
    this.loadMoreChapters();
  }

  loadMoreChapters(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const newChapters = this.filteredChapters.slice(startIndex, endIndex);
    
    this.displayedChapters = [...this.displayedChapters, ...newChapters];
    this.currentPage++;
    this.isLoading = false;
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const scrollPosition = window.pageYOffset + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    
    // Load more when user is 200px from bottom
    if (scrollPosition >= pageHeight - 200 && !this.isLoading) {
      if (this.displayedChapters.length < this.filteredChapters.length) {
        this.loadMoreChapters();
      }
    }
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value.toLowerCase();
    this.applyFilters();
  }

  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus = select.value;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredChapters = this.allChapters.filter(chapter => {
      const matchesSearch = !this.searchTerm || 
        chapter.chapterNo.toString().includes(this.searchTerm) ||
        chapter.title.toLowerCase().includes(this.searchTerm) ||
        chapter.author.toLowerCase().includes(this.searchTerm);
      
      const matchesStatus = !this.selectedStatus || 
        chapter.status.toLowerCase() === this.selectedStatus.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });

    // Reset pagination
    this.displayedChapters = [];
    this.currentPage = 1;
    this.allChaptersPage = 1;
    this.loadMoreChapters();
  }

  trackByChapter(index: number, chapter: Chapter): number {
    return chapter.chapterNo;
  }

  // ── Sidebar tab navigation ──────────────────────────────────
  setTab(tab: string): void {
    this.activeTab = tab;
  }

  getUserInitials(): string {
    const name: string = this.userInfo?.username || '';
    return name.split(' ').map((n: string) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || 'U';
  }

  // ── Pagination ──────────────────────────────────────────────
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.allChaptersPage = page;
  }

  getPagesArray(): number[] {
    const total = this.totalPages;
    const current = this.allChaptersPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: number[] = [1];
    if (current > 4) pages.push(-1);
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 3) pages.push(-1);
    pages.push(total);
    return pages;
  }

  // ── Status / action helpers ─────────────────────────────────
  getStatusClass(status: string): string {
    const s = (status ?? '').toLowerCase().replace(/[\s-]/g, '');
    if (s === 'completed') return 'status-completed';
    if (s === 'inprogress') return 'status-in-progress';
    if (s === 'yettostart') return 'status-yet-to-start';
    return 'status-yet-to-start';
  }

  getStatusLabel(status: string): string {
    const s = (status ?? '').toLowerCase().replace(/[\s-]/g, '');
    if (s === 'completed') return 'Completed';
    if (s === 'inprogress') return 'In Progress';
    if (s === 'yettostart') return 'Yet-to-Start';
    return status ?? '';
  }

  getActionIcon(status: string): string {
    const s = (status ?? '').toLowerCase().replace(/[\s-]/g, '');
    if (s === 'completed') return 'fas fa-eye';
    if (s === 'inprogress') return 'fas fa-pencil-alt';
    return 'fas fa-arrow-right';
  }

  getActionTitle(status: string): string {
    const s = (status ?? '').toLowerCase().replace(/[\s-]/g, '');
    if (s === 'completed') return 'View';
    if (s === 'inprogress') return 'Edit';
    return 'Proceed';
  }
}
