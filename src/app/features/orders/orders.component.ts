import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { Order } from '../../core/interfaces';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, NgClass],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Orders</h1>
          <p class="text-surface-500 mt-1">Manage and view all WooCommerce orders</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="btn-ghost" [disabled]="!orders().length">
            <i class="pi pi-download"></i>
            Export CSV
          </button>
          <button (click)="refresh()" class="btn-ghost">
            <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-4 mb-6">
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative flex-1 min-w-[200px]">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm"></i>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value); loadOrders()"
                   placeholder="Search orders..." class="input-field pl-9">
          </div>
          <select [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value); loadOrders()"
                  class="input-field w-auto min-w-[150px]">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="on-hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <span class="text-sm text-surface-400">{{ totalOrders() }} orders</span>
        </div>
      </div>

      <!-- Orders Table -->
      <div class="glass-card overflow-hidden">
        @if (loading()) {
          <div class="p-6 space-y-4">
            @for (_ of [1,2,3,4,5]; track _) {
              <div class="flex items-center gap-4">
                <div class="skeleton-pulse h-5 w-20"></div>
                <div class="skeleton-pulse h-5 w-32"></div>
                <div class="skeleton-pulse h-5 w-28"></div>
                <div class="skeleton-pulse h-5 w-20"></div>
                <div class="skeleton-pulse h-5 w-24"></div>
                <div class="skeleton-pulse h-5 w-16 ml-auto"></div>
              </div>
            }
          </div>
        } @else if (!orders().length) {
          <div class="text-center py-16 text-surface-400">
            <i class="pi pi-shopping-cart text-4xl mb-4 block"></i>
            <p class="text-lg font-medium">No orders found</p>
            <p class="text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-surface-200 dark:border-surface-700">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Order</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Customer</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Mobile</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Amount</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Date</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (order of orders(); track order.id) {
                  <tr class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                    <td class="px-4 py-3 text-sm font-medium text-surface-900 dark:text-white">#{{ order.orderNumber }}</td>
                    <td class="px-4 py-3 text-sm text-surface-700 dark:text-surface-300">{{ order.customerName }}</td>
                    <td class="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{{ utils.formatIndianMobile(order.mobile) }}</td>
                    <td class="px-4 py-3 text-sm font-semibold text-surface-900 dark:text-white">{{ utils.formatCurrency(order.total) }}</td>
                    <td class="px-4 py-3"><span [class]="utils.getStatusClass(order.status)">{{ utils.getStatusLabel(order.status) }}</span></td>
                    <td class="px-4 py-3 text-sm text-surface-500">{{ order.dateCreated | date:'dd MMM, hh:mm a' }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2">
                        <a [routerLink]="['/orders', order.id]" class="btn-ghost p-1.5" title="View">
                          <i class="pi pi-eye"></i>
                        </a>
                        <button (click)="downloadPdf(order.id)" class="btn-ghost p-1.5 text-blue-600 hover:text-blue-700" title="Download PDF">
                          <i class="pi pi-file-pdf"></i>
                        </button>
                        <button (click)="utils.openWhatsApp(order.mobile)" class="btn-ghost p-1.5 text-green-600 hover:text-green-700" title="WhatsApp">
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
            <span class="text-sm text-surface-400">Page {{ currentPage() }} of {{ totalPages() }}</span>
            <div class="flex items-center gap-2">
              <button [disabled]="currentPage() <= 1" (click)="changePage(currentPage() - 1)"
                      class="btn-ghost p-1.5 disabled:opacity-30" [class.cursor-not-allowed]="currentPage() <= 1">
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
                      class="btn-ghost p-1.5 disabled:opacity-30" [class.cursor-not-allowed]="currentPage() >= totalPages()">
                <i class="pi pi-chevron-right"></i>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  loading = signal(true);
  orders = signal<Order[]>([]);
  totalOrders = signal(0);
  currentPage = signal(1);
  totalPages = signal(1);
  perPage = 20;
  searchTerm = signal('');
  statusFilter = signal('');
  initialized = signal(false);

  pageNumbers = signal<number[]>([]);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading.set(true);
    this.api.getOrders({
      page: this.currentPage(),
      perPage: this.perPage,
      status: this.statusFilter() || undefined,
      search: this.searchTerm() || undefined,
    }).subscribe({
      next: (res) => {
        this.orders.set(res.orders);
        this.totalOrders.set(res.total);
        this.totalPages.set(Math.max(1, Math.ceil(res.total / res.perPage)));
        this.updatePageNumbers();
        this.loading.set(false);
        this.initialized.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.initialized.set(true);
      },
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
  }

  refresh(): void {
    this.currentPage.set(1);
    this.loadOrders();
  }

  exportCsv(): void {
    const data = this.orders().map((o) => ({
      'Order #': o.orderNumber,
      Customer: o.customerName,
      Mobile: o.mobile,
      Amount: o.total,
      Status: o.status,
      Date: o.dateCreated,
    }));
    this.utils.exportToCsv(data, `orders-${new Date().toISOString().slice(0, 10)}`);
  }

  getInvoiceUrl(orderId: number): string {
    const base = environment.apiUrl.replace('/wp-json/sellwin/v1', '');
    return `${base}/?sellwin_invoice=1&order_id=${orderId}&consumer_key=${environment.consumerKey}&consumer_secret=${environment.consumerSecret}`;
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
