import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { AbandonedCart } from '../../core/interfaces';
import { whatsappConfig } from '../../../environments/environment';

@Component({
  selector: 'app-abandoned-carts',
  standalone: true,
  imports: [NgClass, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Abandoned Carts</h1>
          <p class="text-surface-500 mt-1">Customers who added products but haven't returned</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="btn-ghost" [disabled]="!carts().length">
            <i class="pi pi-download"></i> Export CSV
          </button>
          <button (click)="refresh()" class="btn-ghost">
            <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">
          @for (f of filters; track f.key) {
            <button (click)="setFilter(f.key)"
                    [class]="f.key === activeFilter() ? 'btn-primary' : 'btn-ghost'">
              {{ f.label }}
            </button>
          }
          <div class="relative flex-1 min-w-[200px] ml-auto">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm"></i>
            <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()"
                   placeholder="Search by name or phone..." class="input-field pl-9">
          </div>
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        @if (loading()) {
          <div class="p-6 space-y-4">
            @for (_ of [1,2,3]; track _) {
              <div class="flex gap-4"><div class="skeleton-pulse h-5 w-32"></div><div class="skeleton-pulse h-5 w-28"></div><div class="skeleton-pulse h-5 w-16"></div><div class="skeleton-pulse h-5 w-20"></div><div class="skeleton-pulse h-5 w-24 ml-auto"></div></div>
            }
          </div>
        } @else if (!carts().length) {
          <div class="text-center py-16 text-surface-400">
            <i class="pi pi-smile text-4xl mb-4 block"></i>
            <p class="text-lg font-medium">No abandoned carts</p>
            <p class="text-sm mt-1">Great! No customers have abandoned their carts</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-surface-200 dark:border-surface-700">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('name')">
                    Customer {{ sortIcon('name') }}
                  </th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('mobile')">
                    Phone {{ sortIcon('mobile') }}
                  </th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('product_count')">
                    Products {{ sortIcon('product_count') }}
                  </th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('cart_value')">
                    Cart Value {{ sortIcon('cart_value') }}
                  </th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('last_activity')">
                    Abandoned {{ sortIcon('last_activity') }}
                  </th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (cart of carts(); track cart.id) {
                  <tr class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                    <td class="px-4 py-3 text-sm font-medium text-surface-900 dark:text-white">{{ cart.name || 'Guest' }}</td>
                    <td class="px-4 py-3 text-sm">
                      @if (cart.mobile) {
                        <a [href]="getWhatsAppUrl(cart.mobile)" target="_blank" class="text-green-600 hover:text-green-700 font-semibold" title="Chat on WhatsApp">
                          {{ cart.mobile }}
                        </a>
                      } @else {
                        <span class="text-surface-400">—</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-sm text-center text-surface-700 dark:text-surface-300">{{ cart.products }}</td>
                    <td class="px-4 py-3 text-sm text-right font-semibold text-surface-900 dark:text-white">{{ utils.formatCurrency(cart.cartValue) }}</td>
                    <td class="px-4 py-3 text-sm text-right text-surface-500">{{ cart.abandonedSince }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="utils.openWhatsApp(cart.mobile, whatsappMsg)"
                                class="btn-ghost p-1.5 text-green-600 hover:text-green-700" title="WhatsApp">
                          <i class="pi pi-whatsapp"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-surface-200 dark:border-surface-700">
            <span class="text-sm text-surface-400">
              Showing {{ (currentPage() - 1) * perPage + 1 }}–{{ Math.min(currentPage() * perPage, totalCarts()) }} of {{ totalCarts() }}
            </span>
            <div class="flex items-center gap-2">
              <button [disabled]="currentPage() <= 1" (click)="changePage(currentPage() - 1)"
                      class="btn-ghost p-1.5 disabled:opacity-30">
                <i class="pi pi-chevron-left"></i>
              </button>
              @for (p of pageNumbers(); track p) {
                <button (click)="changePage(p)"
                        [class.bg-primary-600!]="p === currentPage()"
                        [class.text-white!]="p === currentPage()"
                        class="w-8 h-8 rounded-lg text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-700 transition">
                  {{ p }}
                </button>
              }
              <button [disabled]="currentPage() >= totalPages()" (click)="changePage(currentPage() + 1)"
                      class="btn-ghost p-1.5 disabled:opacity-30">
                <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AbandonedCartsComponent implements OnInit {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  Math = Math;
  whatsappMsg = whatsappConfig.followUpMessage;

  loading = signal(true);
  carts = signal<AbandonedCart[]>([]);
  totalCarts = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 20;
  activeFilter = signal('all');
  sortColumn = signal('last_activity');
  sortDirection = signal<'ASC' | 'DESC'>('DESC');
  searchTerm = '';
  pageNumbers = signal<number[]>([]);

  filters = [
    { key: '5min', label: 'Last 5 min' },
    { key: '10min', label: 'Last 10 min' },
    { key: '30min', label: 'Last 30 min' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'all', label: 'All Time' },
  ];

  ngOnInit(): void {
    this.loadCarts();
  }

  loadCarts(): void {
    this.loading.set(true);
    this.api.getAbandonedCarts({
      filter: this.activeFilter(),
      search: this.searchTerm || undefined,
      sort: this.sortColumn(),
      order: this.sortDirection(),
      page: this.currentPage(),
      perPage: this.perPage,
    }).subscribe({
      next: (res) => {
        this.carts.set(res.carts || []);
        this.totalCarts.set(res.total || 0);
        this.totalPages.set(res.totalPages || 1);
        this.updatePageNumbers();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(key: string): void {
    this.activeFilter.set(key);
    this.currentPage.set(1);
    this.loadCarts();
  }

  toggleSort(col: string): void {
    if (this.sortColumn() === col) {
      this.sortDirection.set(this.sortDirection() === 'DESC' ? 'ASC' : 'DESC');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('DESC');
    }
    this.currentPage.set(1);
    this.loadCarts();
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '';
    return this.sortDirection() === 'ASC' ? ' ▲' : ' ▼';
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCarts();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadCarts();
  }

  refresh(): void {
    this.currentPage.set(1);
    this.loadCarts();
  }

  getWhatsAppUrl(mobile: string): string {
    return `https://wa.me/${whatsappConfig.countryCode}${mobile}?text=${encodeURIComponent(this.whatsappMsg)}`;
  }

  exportCsv(): void {
    const data = this.carts().map((c) => ({
      Customer: c.name || 'Guest',
      Mobile: c.mobile,
      Products: c.products,
      'Cart Value': c.cartValue,
      'Abandoned Since': c.abandonedSince,
    }));
    this.utils.exportToCsv(data, `abandoned-carts-${new Date().toISOString().slice(0, 10)}`);
  }

  private updatePageNumbers(): void {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    this.pageNumbers.set(pages);
  }
}
