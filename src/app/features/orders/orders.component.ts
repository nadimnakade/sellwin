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

  downloadPdf(orderId: number): void {
    this.api.getOrder(orderId).subscribe((order) => {
      const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
      if (!popup) return;
      popup.document.write(this.buildPrintableOrder(order));
      popup.document.close();
      popup.onload = () => {
        popup.document.title = `Order-${order.orderNumber}.pdf`;
        popup.focus();
        popup.print();
      };
    });
  }

  private buildPrintableOrder(order: any): string {
    const rows = order.products.map((item: any) => `
      <tr>
        <td><div class="product">${item.image ? `<img src="${item.image}" alt="">` : '<div class="placeholder">No image</div>'}<div><strong>${this.escape(item.name)}</strong><br><small>SKU: ${this.escape(item.sku || 'N/A')}</small></div></div></td>
        <td>${item.quantity}</td>
        <td>${this.utils.formatCurrency(item.price)}</td>
        <td>${this.utils.formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');

    return `<!doctype html><html><head><title>Order-${this.escape(order.orderNumber)}.pdf</title><style>
      body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:28px;background:#fff}.top{display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:16px}h1{margin:0;font-size:28px}.muted{color:#6b7280}.badge{display:inline-block;background:#eef2ff;color:#3730a3;border-radius:999px;padding:5px 10px;font-size:12px;text-transform:uppercase}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:22px 0}.box{border:1px solid #e5e7eb;border-radius:10px;padding:14px}.box h3{font-size:12px;color:#6b7280;text-transform:uppercase;margin:0 0 10px}table{width:100%;border-collapse:collapse;margin-top:18px}th{font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding:10px}td{border-bottom:1px solid #f3f4f6;padding:12px 10px;vertical-align:middle}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.product{display:flex;align-items:center;gap:12px}.product img,.placeholder{width:54px;height:54px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb}.placeholder{display:flex;align-items:center;justify-content:center;font-size:10px;color:#9ca3af}.totals{margin-left:auto;width:320px;margin-top:18px}.line{display:flex;justify-content:space-between;padding:7px 0}.total{font-weight:700;font-size:20px;border-top:2px solid #111827;margin-top:8px;padding-top:12px}@media print{body{padding:0}.box{break-inside:avoid}}</style></head><body>
      <div class="top"><div><h1>Order #${this.escape(order.orderNumber)}</h1><p class="muted">${new Date(order.dateCreated).toLocaleString('en-IN')}</p></div><div style="text-align:right"><div class="badge">${this.escape(this.utils.getStatusLabel(order.status))}</div><h2>${this.utils.formatCurrency(order.total)}</h2></div></div>
      <div class="grid"><div class="box"><h3>Customer</h3><strong>${this.escape(order.customer.name)}</strong><br>${this.escape(order.customer.mobile)}<br>${this.escape(order.customer.email || 'N/A')}</div><div class="box"><h3>Billing</h3>${this.escape(this.formatAddress(order.billing))}</div><div class="box"><h3>Shipping</h3>${this.escape(this.formatAddress(order.shipping.address1 ? order.shipping : order.billing) || 'Same as billing')}</div></div>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="totals"><div class="line"><span>Subtotal</span><span>${this.utils.formatCurrency(order.subtotal)}</span></div><div class="line"><span>Discount</span><span>-${this.utils.formatCurrency(order.discountTotal)}</span></div><div class="line"><span>Tax</span><span>${this.utils.formatCurrency(order.taxTotal)}</span></div><div class="line"><span>Shipping</span><span>${this.utils.formatCurrency(order.shippingTotal)}</span></div><div class="line total"><span>Total</span><span>${this.utils.formatCurrency(order.total)}</span></div></div>
      </body></html>`;
  }

  private formatAddress(address: any): string {
    return [address.address1, address.address2, address.city, address.state, address.postcode, address.country].filter(Boolean).join(', ');
  }

  private escape(value: string): string {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
