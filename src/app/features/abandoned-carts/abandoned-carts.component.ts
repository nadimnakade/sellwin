import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { NgClass, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { whatsappConfig, environment } from '../../../environments/environment';

interface CartBountyCart {
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
    thumbnail: string;
    sku: string;
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
  imports: [NgClass, FormsModule, TitleCasePipe],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Latest Cart Changes</h1>
          <p class="text-surface-500 mt-1">Recent orders in cart from customers idle for at least 1 minute</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-surface-400">Auto-refresh: 60s</span>
          <button (click)="exportCsv()" class="btn-ghost">
            <i class="pi pi-download"></i> Export CSV
          </button>
          <button (click)="refresh()" class="btn-ghost">
            <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 mb-6">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Time Range Filters -->
          @for (f of timeRangeFilters; track f.key) {
            <button (click)="setTimeFilter(f.key)"
                    [class]="f.key === activeFilter() ? 'btn-primary' : 'btn-ghost'">
              {{ f.label }}
            </button>
          }
          <div class="flex items-center gap-2 ml-auto">
            <!-- Status Dropdown -->
            <select [(ngModel)]="activeStatusFilter" (ngModelChange)="onStatusFilterChange()"
                    class="text-xs px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
              @for (s of statusFilters; track s.key) {
                <option [value]="s.key">{{ s.label }}</option>
              }
            </select>
            <!-- Search -->
            <div class="relative min-w-[180px]">
              <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm"></i>
              <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="onSearch()"
                     placeholder="Search by name, email, or phone..." class="input-field pl-9">
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-surface-900 dark:text-white">{{ stats().total }}</div>
          <div class="text-xs text-surface-500 mt-1">Total Carts</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-amber-600">{{ stats().active }}</div>
          <div class="text-xs text-surface-500 mt-1">Active (24h)</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-green-600">{{ stats().recovered }}</div>
          <div class="text-xs text-surface-500 mt-1">Recovered</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ utils.formatCurrency(stats().total_value) }}</div>
          <div class="text-xs text-surface-500 mt-1">Cart Value at Risk</div>
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        @if (loading()) {
          <div class="p-6 space-y-4">
            @for (_ of [1,2,3,4,5]; track _) {
              <div class="flex gap-4 items-center">
                <div class="skeleton-pulse h-10 w-10 rounded-full"></div>
                <div class="skeleton-pulse h-5 w-32"></div>
                <div class="skeleton-pulse h-5 w-28"></div>
                <div class="skeleton-pulse h-5 w-16"></div>
                <div class="skeleton-pulse h-5 w-24 ml-auto"></div>
              </div>
            }
          </div>
        } @else if (!carts().length) {
          <div class="text-center py-16 text-surface-400">
            <i class="pi pi-smile text-4xl mb-4 block"></i>
            <p class="text-lg font-medium">No latest cart changes</p>
            <p class="text-sm mt-1">Carts will appear here after a customer is idle for 1 minute</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-surface-200 dark:border-surface-700">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Customer</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Contact</th>
                  th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('cart_total')">
                    Cart Total {{ sortIcon('cart_total') }}
                  </th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase cursor-pointer hover:text-surface-700" (click)="toggleSort('time')">
                    Last Cart Change {{ sortIcon('time') }}
                  </th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Follow-up</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (cart of carts(); track cart.id) {
                  <tr class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                    <!-- Customer -->
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-sm font-semibold text-surface-600 dark:text-surface-300">
                          {{ getInitials(getFullName(cart)) }}
                        </div>
                        <div>
                          <div class="text-sm font-medium text-surface-900 dark:text-white">{{ getFullName(cart) || 'Guest' }}</div>
                          @if (cart.email) {
                            <div class="text-xs text-surface-400">{{ cart.email }}</div>
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
                            <i class="pi pi-whatsapp text-xs"></i> {{ cart.phone }}
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

                    <!-- Follow-up Status -->
                    <td class="px-4 py-3">
                      <select [value]="cart.contacted_status || ''"
                              (change)="updateStatus(cart.id, $event)"
                              class="w-full text-xs px-2 py-1.5 rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <option value="">Select...</option>
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="converted">Converted</option>
                        <option value="closed">Closed</option>
                      </select>
                      @if (cart.contacted_via) {
                        <div class="text-[10px] text-surface-400 mt-1">
                          {{ cart.contacted_via === 'whatsapp' ? 'WhatsApp' : 'Call' }} - {{ cart.contacted_via | titlecase }}
                        </div>
                      }
                    </td>

                    <!-- Actions -->
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button (click)="cart.phone && utils.openWhatsApp(cart.phone, whatsappMsg)"
                                [disabled]="!cart.phone"
                                class="p-1.5 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                [title]="cart.phone ? 'WhatsApp' : 'Phone number missing'">
                          <i class="pi pi-whatsapp"></i>
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
export class AbandonedCartsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  Math = Math;
  whatsappMsg = whatsappConfig.followUpMessage;

  loading = signal(true);
  carts = signal<CartBountyCart[]>([]);
  totalCarts = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 20;
  activeFilter = signal('all');
  activeStatusFilter = signal('');
  sortColumn = signal('time');
  sortDirection = signal<'asc' | 'desc'>('desc');
  searchTerm = '';
  pageNumbers = signal<number[]>([]);
  stats = signal({ total: 0, active: 0, recovered: 0, total_value: 0 });

  timeRangeFilters = [
    { key: '5m', label: '5 Mins' },
    { key: '1h', label: '1 Hour' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
    { key: 'all', label: 'All Time' },
  ];

  statusFilters = [
    { key: '', label: 'All Statuses' },
    { key: 'recoverable', label: 'Recoverable' },
    { key: 'recovered', label: 'Recovered' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'new', label: 'New' },
  ];

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadCarts();
    this.loadStats();
    this.refreshTimer = setInterval(() => {
      this.loadCarts();
      this.loadStats();
    }, 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadCarts(): void {
    this.loading.set(true);
    const timeRange = this.activeFilter() === 'all' ? '' : this.activeFilter();
    this.api.getCartBountyCarts({
      page: this.currentPage(),
      perPage: this.perPage,
      status: this.activeStatusFilter() || undefined,
      search: this.searchTerm || undefined,
      orderby: this.sortColumn(),
      order: this.sortDirection(),
      idleMinutes: 1,
      timeRange: timeRange || undefined,
    }).subscribe({
      next: (res) => {
        this.carts.set(res.carts || []);
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
      error: () => {},
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

  getWhatsAppUrl(phone: string): string {
    const clean = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/91${clean}?text=${encodeURIComponent(this.whatsappMsg)}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getFullName(cart: CartBountyCart): string {
    return [cart.name, cart.surname].filter(Boolean).join(' ').trim();
  }

  getTimeAgo(time: string): string {
    const timestamp = new Date(time.replace(' ', 'T')).getTime();
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

  updateStatus(cartId: number, event: Event): void {
    const status = (event.target as HTMLSelectElement).value;
    if (!status) return;
    this.api.updateCartStatus(cartId, status).subscribe({
      next: () => this.loadStats(),
    });
  }

  downloadPdf(cartId: number): void {
    const cart = this.carts().find(c => c.id === cartId);
    if (!cart) return;

    const win = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!win) {
        alert('Please allow pop-ups for PDF download');
        return;
    }

    const name = ((cart.name || '') + ' ' + (cart.surname || '')).trim();
    const items = cart.products || [];
    const itemRows = items.map((item, index) => `
      <tr>
        <td>
          <div class="product">
            ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}">` : '<div class="image-fallback">No image</div>'}
            <div>
              <div class="product-title">${item.title}</div>
              <div class="muted">Product ID: ${item.product_id}</div>
            </div>
          </div>
        </td>
        <td>${item.sku || 'N/A'}</td>
        <td>${this.utils.formatCurrency(item.price)}</td>
        <td>${item.quantity}</td>
        <td>${this.utils.formatCurrency(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    // Generate HTML content
    const htmlContent = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Abandoned Cart #${cartId}.pdf</title>
          <style>
            *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0;background:#fff;padding:28px}
            .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111827;padding-bottom:18px;margin-bottom:20px}
            .brand{display:flex;align-items:center;gap:12px}
            .logo{width:54px;height:54px;border-radius:14px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
            .brand h1{margin:0;font-size:26px}
            .meta{text-align:right}
            .meta h2{margin:0 0 8px;font-size:20px}
            .muted{color:#64748b;font-size:12px}
            .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:20px}
            .box{border:1px solid #e5e7eb;border-radius:10px;padding:14px;min-height:96px}
            .box-title{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:8px}
            .box strong{display:block;margin-bottom:4px}
            table{width:100%;border-collapse:collapse}
            thead{background:#f8fafc}
            th{font-size:11px;text-transform:uppercase;color:#64748b;text-align:left;padding:12px;border-bottom:1px solid #e5e7eb}
            td{padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:middle}
            th:nth-child(n+2),td:nth-child(n+2){text-align:right}
            .product{display:flex;align-items:center;gap:12px}
            .product img,.image-fallback{width:58px;height:58px;border-radius:8px;border:1px solid #e5e7eb;object-fit:cover}
            .image-fallback{display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px}
            .product-title{font-weight:700}
            .totals{width:320px;margin:20px 0 0 auto}
            .line{display:flex;justify-content:space-between;padding:7px 0}
            .grand{border-top:2px solid #111827;margin-top:8px;padding-top:12px;font-size:20px;font-weight:800}
            .footer{margin-top:28px;text-align:center;color:#64748b;font-size:11px}
            @media print{body{padding:0}.box,.product{break-inside:avoid}thead{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <div class="logo">SW</div>
              <div>
                <h1>Sellwin</h1>
                <div class="muted">Abandoned cart summary</div>
              </div>
            </div>
            <div class="meta">
              <h2>Cart #${cart.id}</h2>
              <div><strong>Date:</strong> ${new Date(cart.time).toLocaleString('en-IN')}</div>
              <div><strong>Status:</strong> ${cart.contacted_status || 'Pending'}</div>
            </div>
          </div>

          <div class="summary">
            <div class="box">
              <div class="box-title">Customer</div>
              <strong>${name || 'Guest'}</strong>
              <div>${cart.email || 'N/A'}</div>
              <div>${cart.phone || 'N/A'}</div>
            </div>
            <div class="box">
              <div class="box-title">Payment</div>
              <strong>N/A</strong>
              <div class="muted">Paid: N/A</div>
            </div>
            <div class="box">
              <div class="box-title">Shipping</div>
              <div>Same as billing</div>
            </div>
          </div>

          <table>
            <thead><tr><th>Title</th><th>SKU</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>

          <div class="totals">
            <div class="line"><span>Subtotal</span><span>${this.utils.formatCurrency(cart.cart_total)}</span></div>
            <div class="line"><span>Discount</span><span>-${this.utils.formatCurrency(0)}</span></div>
            <div class="line"><span>Tax</span><span>${this.utils.formatCurrency(0)}</span></div>
            <div class="line"><span>Shipping</span><span>${this.utils.formatCurrency(0)}</span></div>
            <div class="line grand"><span>Total</span><span>${this.utils.formatCurrency(cart.cart_total)}</span></div>
          </div>

          <div class="footer">Generated by Sellwin on ${new Date().toLocaleString('en-IN')}</div>
        </body>
      </html>
    `;

    // Write to the new window and close document
    win.document.open();
    win.document.write(htmlContent);
    win.document.close();

    // Print functionality with fallback
    const printPDF = () => {
        try {
            win.focus();
            win.print();
        } catch (e) {
            console.error('Print error:', e);
            alert('Please use your browser\'s print function (Ctrl+P or Cmd+P) to save as PDF');
        }
    };

    // Trigger print after content loads
    win.onload = () => setTimeout(printPDF, 500);

    // Backup timeout
    setTimeout(printPDF, 1000);
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
