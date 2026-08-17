import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { PdfService } from '../../core/services/pdf.service';
import { whatsappConfig, environment } from '../../../environments/environment';
import { CartSharedService } from './cart-shared.service';
import { OrderDetail, OrderItem } from '../../core/interfaces';
import { PdfConfig } from '../../core/services/pdf.service';

export interface CartBountyCart {
  id: number;
  name: string;
  surname: string;
  email: string;
  phone: string;
  location: string;
  products: Array<{
    product_id: number;
    title: string;
    quantity: number;
    price: number;
    subtotal: number;
    thumbnail: string;
    sku: string;
    imageBase64: string | null;
  }>;
  cart_total: number;
  currency: string;
  time: string;
  type: string;
  saved_via: string;
  contacted_status: string;
  contacted_time: string;
  contacted_via: string;
}

@Component({
  selector: 'app-abandoned-carts',
  standalone: true,
  imports: [NgClass, FormsModule],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="page-title">Latest Cart Changes</h1>
          <p class="text-surface-500 mt-1 text-sm">Recent orders in cart from customers idle for at least 1 minute</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-surface-400 hidden sm:inline">Auto-refresh: 60s</span>
          <button (click)="exportCsv()" class="btn-ghost text-sm">
            <i class="pi pi-download"></i> <span class="hidden sm:inline">Export CSV</span>
          </button>
          <button (click)="refresh()" class="btn-ghost text-sm">
            <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-3 sm:p-4 mb-4 sm:mb-6">
        <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <!-- Time Range Filters -->
          <div class="flex flex-wrap gap-1 sm:gap-2">
            @for (f of timeRangeFilters; track f.key) {
              <button (click)="setTimeFilter(f.key)"
                      [class]="f.key === activeFilter() ? 'btn-primary' : 'btn-ghost'"
                      class="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                {{ f.label }}
              </button>
            }
          </div>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <!-- Sort (mobile only) -->
            <div class="flex items-center gap-2 md:hidden">
              <label class="text-xs text-surface-500 shrink-0">Sort:</label>
              <select (change)="onMobileSortChange($event)"
                      class="text-xs px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 flex-1">
                <option value="time-desc">Newest First</option>
                <option value="time-asc">Oldest First</option>
                <option value="cart_total-desc">Highest Total</option>
                <option value="cart_total-asc">Lowest Total</option>
              </select>
            </div>
            <!-- Status Dropdown -->
            <select [(ngModel)]="activeStatusFilter" (ngModelChange)="onStatusFilterChange()"
                    class="text-xs px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto">
              @for (s of statusFilters; track s.key) {
                <option [value]="s.key">{{ s.label }}</option>
              }
            </select>
            <!-- Search -->
            <div class="relative w-full sm:w-auto sm:min-w-[180px]">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm"></i>
              <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()"
                     placeholder="Search..." class="input-field pl-9 text-xs sm:text-sm">
            </div>
          </div>
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        @if (loading()) {
          <!-- Desktop skeleton -->
          <div class="p-4 sm:p-6 space-y-4 hidden md:block">
            @for (_ of [1,2,3,4,5]; track _) {
              <div class="flex gap-4 items-center">
                <div class="skeleton-pulse h-10 w-10 rounded-full shrink-0"></div>
                <div class="skeleton-pulse h-5 w-32"></div>
                <div class="skeleton-pulse h-5 w-28"></div>
                <div class="skeleton-pulse h-5 w-16 ml-auto"></div>
                <div class="skeleton-pulse h-5 w-24"></div>
              </div>
            }
          </div>
          <!-- Mobile skeleton -->
          <div class="p-4 space-y-4 md:hidden">
            @for (_ of [1,2,3]; track _) {
              <div class="flex items-start gap-3">
                <div class="skeleton-pulse h-9 w-9 rounded-full shrink-0"></div>
                <div class="flex-1 space-y-2">
                  <div class="skeleton-pulse h-4 w-28"></div>
                  <div class="skeleton-pulse h-3 w-40"></div>
                  <div class="skeleton-pulse h-6 w-24 rounded-md mt-2"></div>
                  <div class="flex justify-between items-center mt-3">
                    <div class="skeleton-pulse h-4 w-16"></div>
                    <div class="flex gap-1">
                      <div class="skeleton-pulse h-8 w-8 rounded-md"></div>
                      <div class="skeleton-pulse h-8 w-8 rounded-md"></div>
                      <div class="skeleton-pulse h-8 w-8 rounded-md"></div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (!carts().length) {
          <div class="text-center py-12 sm:py-16 text-surface-400">
            <i class="pi pi-smile text-3xl sm:text-4xl mb-4 block"></i>
            <p class="text-base sm:text-lg font-medium">No latest cart changes</p>
            <p class="text-xs sm:text-sm mt-1">Carts will appear here after a customer is idle for 1 minute</p>
          </div>
        } @else {
          <!-- Desktop Table -->
          <div class="overflow-x-auto hidden md:block">
            <table class="w-full">
              <thead>
                <tr class="border-b border-surface-200 dark:border-surface-700">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Customer</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Contact</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('cart_total')" [attr.aria-label]="'Sort by cart total ' + (sortColumn() === 'cart_total' ? (sortDirection() === 'asc' ? 'descending' : 'ascending') : '')">
                    Cart Total {{ sortIcon('cart_total') }}
                  </th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('time')" [attr.aria-label]="'Sort by time ' + (sortColumn() === 'time' ? (sortDirection() === 'asc' ? 'descending' : 'ascending') : '')">
                    Last Cart Change {{ sortIcon('time') }}
                  </th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (cart of carts(); track cart.id) {
                  <tr class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                    <!-- Customer -->
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-sm font-semibold text-surface-600 dark:text-surface-300 shrink-0">
                          {{ getInitials(getFullName(cart)) }}
                        </div>
                        <div class="min-w-0">
                          <div class="text-sm font-medium text-surface-900 dark:text-white truncate">{{ getFullName(cart) || 'Guest' }}</div>
                          @if (cart.email) {
                            <div class="text-xs text-surface-400 truncate">{{ cart.email }}</div>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Contact -->
                    <td class="px-4 py-3">
                      @if (cart.phone) {
                        <div class="flex items-center gap-2">
                          <a [href]="getWhatsAppUrl(cart.phone)" target="_blank"
                             class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition"
                             (click)="trackWhatsApp(cart.id)">
                            <i class="pi pi-whatsapp text-xs"></i> {{ displayPhone(cart.phone) }}
                          </a>
                          <a [href]="'tel:' + cart.phone" class="text-surface-400 hover:text-surface-600">
                            <i class="pi pi-phone text-xs"></i>
                          </a>
                        </div>
                      } @else {
                        <span class="text-surface-400 text-sm">—</span>
                      }
                    </td>

                    <!-- Cart Total -->
                    <td class="px-4 py-3 text-right">
                      <span class="text-sm font-bold text-surface-900 dark:text-white">{{ utils.formatCurrency(cart.cart_total) }}</span>
                    </td>

                    <!-- Time -->
                    <td class="px-4 py-3 text-right">
                      <span class="text-sm text-surface-500">{{ getTimeAgo(cart.time) }}</span>
                    </td>

                    <!-- Actions -->
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button (click)="viewCart(cart)"
                                class="p-1.5 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                                title="View">
                          <i class="pi pi-eye"></i>
                        </button>
                        <button (click)="sendWhatsAppWithPdf(cart)"
                                [disabled]="!cart.phone || sendingPdfId() === cart.id"
                                class="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                [title]="cart.phone ? 'WhatsApp' : 'Phone number missing'">
                          @if (sendingPdfId() === cart.id) {
                            <i class="pi pi-spin pi-spinner"></i>
                          } @else {
                            <i class="pi pi-whatsapp"></i>
                          }
                        </button>
                        @if (cart.phone) {
                          <a [href]="'tel:' + cart.phone"
                            class="p-1.5 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                            title="Call">
                            <i class="pi pi-phone"></i>
                          </a>
                        } @else {
                          <button disabled
                                  class="p-1.5 rounded-md text-surface-500 opacity-30 cursor-not-allowed"
                                  title="Phone number missing">
                            <i class="pi pi-phone"></i>
                          </button>
                        }
                        <button (click)="downloadPdf(cart.id)"
                                class="p-1.5 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                                title="Download PDF">
                          <i class="pi pi-file-pdf"></i>
                        </button>
                        <button (click)="deleteCart(cart.id)"
                                class="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                title="Delete">
                          <i class="pi pi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="md:hidden divide-y divide-surface-100 dark:divide-surface-800">
            @for (cart of carts(); track cart.id) {
              <div class="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                <!-- Top: Avatar + Name + Time -->
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-sm font-semibold text-surface-600 dark:text-surface-300 shrink-0">
                      {{ getInitials(getFullName(cart)) }}
                    </div>
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-surface-900 dark:text-white truncate">{{ getFullName(cart) || 'Guest' }}</div>
                      @if (cart.email) {
                        <div class="text-xs text-surface-400 truncate">{{ cart.email }}</div>
                      }
                    </div>
                  </div>
                  <span class="text-xs text-surface-400 shrink-0">{{ getTimeAgo(cart.time) }}</span>
                </div>

                <!-- Contact -->
                @if (cart.phone) {
                  <div class="flex items-center gap-2 mb-3">
                    <a [href]="getWhatsAppUrl(cart.phone)" target="_blank"
                       class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition"
                       (click)="trackWhatsApp(cart.id)">
                      <i class="pi pi-whatsapp text-xs"></i> {{ displayPhone(cart.phone) }}
                    </a>
                    <a [href]="'tel:' + cart.phone" class="text-surface-400 hover:text-surface-600">
                      <i class="pi pi-phone text-xs"></i>
                    </a>
                  </div>
                }

                <!-- Bottom: Total + Actions -->
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-surface-900 dark:text-white">{{ utils.formatCurrency(cart.cart_total) }}</span>
                  <div class="flex items-center gap-1">
                    <button (click)="viewCart(cart)"
                            class="p-2 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                            title="View">
                      <i class="pi pi-eye"></i>
                    </button>
                    <button (click)="sendWhatsAppWithPdf(cart)"
                            [disabled]="!cart.phone || sendingPdfId() === cart.id"
                            class="p-2 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            [title]="cart.phone ? 'WhatsApp' : 'Phone number missing'">
                      @if (sendingPdfId() === cart.id) {
                        <i class="pi pi-spin pi-spinner"></i>
                      } @else {
                        <i class="pi pi-whatsapp"></i>
                      }
                    </button>
                    @if (cart.phone) {
                      <a [href]="'tel:' + cart.phone"
                        class="p-2 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                        title="Call">
                        <i class="pi pi-phone"></i>
                      </a>
                    } @else {
                      <button disabled
                              class="p-2 rounded-md text-surface-500 opacity-30 cursor-not-allowed"
                              title="Phone number missing">
                        <i class="pi pi-phone"></i>
                      </button>
                    }
                    <button (click)="downloadPdf(cart.id)"
                            class="p-2 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                            title="Download PDF">
                      <i class="pi pi-file-pdf"></i>
                    </button>
                    <button (click)="deleteCart(cart.id)"
                            class="p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            title="Delete">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-surface-200 dark:border-surface-700">
            <span class="text-xs sm:text-sm text-surface-400">
              Showing {{ (currentPage() - 1) * perPage + 1 }}–{{ Math.min(currentPage() * perPage, totalCarts()) }} of {{ totalCarts() }}
            </span>
            <div class="flex items-center gap-1 sm:gap-2">
              <button [disabled]="currentPage() <= 1" (click)="changePage(currentPage() - 1)"
                      class="btn-ghost p-1.5 disabled:opacity-30">
                <i class="pi pi-chevron-left"></i>
              </button>
              @for (p of pageNumbers(); track p) {
                <button (click)="changePage(p)"
                        [class.bg-primary-600!]="p === currentPage()"
                        [class.text-white!]="p === currentPage()"
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium hover:bg-surface-100 dark:hover:bg-surface-700 transition">
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
export class AbandonedCartsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private cartShared = inject(CartSharedService);
  private router = inject(Router);
  private pdfService = inject(PdfService);
  utils = inject(UtilsService);

  Math = Math;
  whatsappMsg = whatsappConfig.followUpMessage;

  loading = signal(true);
  sendingPdfId = signal<number | null>(null);
  carts = signal<CartBountyCart[]>([]);
  totalCarts = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 20;
  activeFilter = signal('year');
  activeStatusFilter = signal('');
  sortColumn = signal('time');
  sortDirection = signal<'asc' | 'desc'>('desc');
  searchTerm = '';
  pageNumbers = signal<number[]>([]);
  stats = signal({ total: 0, active: 0, recovered: 0, total_value: 0 });
  order = signal<OrderDetail | null>(null);

  timeRangeFilters = [
    // { key: '5m', label: '5 Mins' },
    // { key: '1h', label: '1 Hour' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    // { key: 'year', label: 'All Time' },
  ];

  statusFilters = [
    { key: '', label: 'All' },
    { key: 'unconfirmed', label: 'Unconfirmed' },
    { key: 'confirmed', label: 'Confirmed (Processing)' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'accepted', label: 'Accepted (Processing)' },
  ];

  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private knownCartIds = new Set<number>();

viewCart(cart: CartBountyCart): void {
    this.cartShared.setCart(cart);
    this.router.navigate(['/latest-carts', cart.id]);
  }

  ngOnInit(): void {
    this.requestNotificationPermission();
    this.loadCarts();
    this.loadStats();
    this.refreshTimer = setInterval(() => {
      this.loadCarts();
      this.loadStats();
    }, 60000);
  }

  private requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  private notifyNewCart(cart: CartBountyCart): void {
    const name = [cart.name, cart.surname].filter(Boolean).join(' ') || 'Guest';
    const title = 'New Cart Alert';
    const body = `${name} added ${cart.products?.length || 0} item(s) — ${this.utils.formatCurrency(cart.cart_total)}`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'assets/logo.png', tag: `cart-${cart.id}` } as any);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadCarts(): void {
    this.loading.set(true);
    
    const timeRange = this.activeFilter() === 'all' || !this.activeFilter() ? '' : this.activeFilter();
    this.api.getCartBountyCarts({
      page: this.currentPage(),
      perPage: this.perPage,
      status: this.activeStatusFilter() || undefined,
      search: this.searchTerm || undefined,
      orderby: this.sortColumn(),
      order: this.sortDirection(),
      idleMinutes: 0,
      timeRange: timeRange || undefined,
    }).subscribe({
      next: (res) => {
        const newCarts = res.carts || [];
        const isFirstLoad = this.knownCartIds.size === 0;

        if (!isFirstLoad) {
          newCarts.forEach((cart: CartBountyCart) => {
            if (!this.knownCartIds.has(cart.id)) {
              this.notifyNewCart(cart);
            }
          });
        }

        newCarts.forEach((cart: CartBountyCart) => this.knownCartIds.add(cart.id));
        this.carts.set(newCarts);
        this.totalCarts.set(res.total || 0);
        this.totalPages.set(res.totalPages || res.total_pages || 1);
        this.updatePageNumbers();
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadStats(): void {
    this.api.getCartBountyStats().subscribe({
      next: (res) => this.stats.set(res),
      error: () => { },
    });
  }

  setTimeFilter(key: string): void {
    this.activeFilter.set(key);
    this.currentPage.set(1);
    this.loadCarts();
  }

  onStatusFilterChange(): void {
    this.currentPage.set(1);
    this.loadCarts();
  }

  toggleSort(col: string): void {
    if (this.sortColumn() === col) {
      this.sortDirection.set(this.sortDirection() === 'desc' ? 'asc' : 'desc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('desc');
    }
    this.currentPage.set(1);
    this.loadCarts();
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '';
    return this.sortDirection() === 'asc' ? ' ▲' : ' ▼';
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCarts();
  }

  onMobileSortChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    const [col, dir] = val.split('-');
    this.sortColumn.set(col);
    this.sortDirection.set(dir as 'asc' | 'desc');
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
    this.loadStats();
  }

  displayPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length === 13 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 12 && digits.startsWith('0')) return digits.slice(2);
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  getWhatsAppUrl(phone: string): string {
    const clean = phone.replace(/[^0-9]/g, '');
    const num = clean.length > 10 && clean.startsWith('91') ? clean.slice(2) : clean;
    return `https://wa.me/91${num}?text=${encodeURIComponent(this.whatsappMsg)}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getFullName(cart: CartBountyCart): string {
    return [cart.name, cart.surname].filter(Boolean).join(' ').trim();
  }

  getTimeAgo(time: string): string {
    // CartBounty stores time in UTC (current_time('mysql', true))
    // Append 'Z' so JS treats it as UTC, not local time
    const timestamp = new Date(time.replace(' ', 'T') + 'Z').getTime();
    if (!timestamp) return '';
    const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  trackWhatsApp(cartId: number): void {
    this.api.markWhatsAppContacted(cartId).subscribe();
  }

  async sendWhatsAppWithPdf(cart: CartBountyCart): Promise<void> {
    if (!cart.phone || this.sendingPdfId() === cart.id) return;
    this.sendingPdfId.set(cart.id);

    const config: PdfConfig = {
      title: 'CART INVOICE',
      orderNumber: `C${cart.id}`,
      dateCreated: cart.time,
      total: cart.cart_total,
      customer: { name: this.getFullName(cart), mobile: cart.phone, email: cart.email },
      products: cart.products.map(p => ({
        productId: p.product_id,
        name: p.title,
        sku: p.sku || '',
        quantity: p.quantity,
        price: p.price,
        subtotal: p.subtotal || p.price * p.quantity,
        image: p.thumbnail,
        imageBase64: p.imageBase64,
      })),
      filename: `Cart-Invoice-C${cart.id}.pdf`,
    };

    const blob = this.pdfService.generateBlob(config);
    const filename = `Cart-Invoice-C${cart.id}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: `Hi ${this.getFullName(cart)}, here is your Sellwin cart invoice.`,
        });
        this.sendingPdfId.set(null);
        this.trackWhatsApp(cart.id);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          this.sendingPdfId.set(null);
          return;
        }
      }
    }

    this.api.uploadPdf(blob, filename).subscribe({
      next: (res) => {
        this.sendingPdfId.set(null);
        const msg = `Hi ${this.getFullName(cart)}, your Sellwin cart invoice is ready: ${res.url}`;
        this.utils.openWhatsApp(cart.phone, msg);
        this.trackWhatsApp(cart.id);
      },
      error: () => {
        this.sendingPdfId.set(null);
        const msg = this.whatsappMsg;
        this.utils.openWhatsApp(cart.phone, msg);
      },
    });
  }

  updateStatus(cartId: number, event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    if (!status) return;
    this.api.updateCartStatus(cartId, status).subscribe({
      next: () => this.loadStats(),
    });
  }

  downloadPdf(cartId: any): void {    
    this.api.getCartDetail(cartId).subscribe({
      next: (order) => {
        if (!order) return;

        this.pdfService.generate({
          title: 'CART INVOICE',
          orderNumber: order.orderNumber,
          dateCreated: order.dateCreated,
          total: order.total,
          customer: order.customer,
          products: order.products,
          filename: `Cart-Invoice-${order.orderNumber}.pdf`,
        });
      },
      error: () => { },
    });
  }


  deleteCart(cartId: number): void {
    if (!confirm('Are you sure you want to delete this cart?')) return;
    this.api.deleteCartBountyCart(cartId).subscribe({
      next: () => this.loadCarts(),
    });
  }

  exportCsv(): void {
    const params = new URLSearchParams({
      consumer_key: environment.consumerKey,
      consumer_secret: environment.consumerSecret,
    });
    window.open(`https://deepskyblue-peafowl-120684.hostingersite.com/wp-json/sellwin/v1/export/csv?${params.toString()}`, '_blank');
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
