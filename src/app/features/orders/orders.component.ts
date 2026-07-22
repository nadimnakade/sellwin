import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { PdfService, PdfConfig } from '../../core/services/pdf.service';
import { Order } from '../../core/interfaces';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, DatePipe, NgClass, ToastModule],
  providers: [MessageService],
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
                        <button (click)="sendWhatsAppWithPdf(order)"
                                [disabled]="!order.mobile || sendingPdfId() === order.id"
                                class="btn-ghost p-1.5 text-green-600 hover:text-green-700"
                                [title]="order.mobile ? 'WhatsApp' : 'Phone number missing'">
                          @if (sendingPdfId() === order.id) {
                            <i class="pi pi-spin pi-spinner"></i>
                          } @else {
                            <i class="pi pi-whatsapp"></i>
                          }
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
  private pdfService = inject(PdfService);
  private toast = inject(MessageService);
  utils = inject(UtilsService);

  loading = signal(true);
  sendingPdfId = signal<number | null>(null);
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
    this.api.getOrder(orderId).subscribe((order) => this.utils.downloadOrderPdf(order));
  }

  async sendWhatsAppWithPdf(order: Order): Promise<void> {
    if (!order.mobile || this.sendingPdfId() === order.id) return;
    this.sendingPdfId.set(order.id);

    // Fetch full detail with products
    this.api.getSellwinOrder(order.id).subscribe({
      next: async (detail) => {
        const formatPrice = (price: number): string => {
          return `Rs ${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        };

        const formatDate = (dateStr: string): string => {
          if (!dateStr) return '-';
          const d = new Date(dateStr);
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        };

        const successColor: [number, number, number] = [34, 197, 94];

        const orderInfo: { label: string; value: string; color?: [number, number, number] }[] = [
          { label: 'Status', value: this.utils.getStatusLabel(detail.status), color: successColor },
        ];
        if (detail.paymentMethod) {
          orderInfo.push({ label: 'Payment', value: detail.paymentMethod });
        }
        if (detail.datePaid) {
          orderInfo.push({ label: 'Paid', value: formatDate(detail.datePaid) });
        }

        const summaryLines: { label: string; value: string; color?: [number, number, number] }[] = [];
        if (detail.subtotal !== detail.total) {
          summaryLines.push({ label: 'Subtotal:', value: formatPrice(detail.subtotal) });
        }
        if (detail.discountTotal > 0) {
          summaryLines.push({ label: 'Discount:', value: `-${formatPrice(detail.discountTotal)}`, color: successColor });
        }
        if (detail.taxTotal > 0) {
          summaryLines.push({ label: 'Tax:', value: formatPrice(detail.taxTotal) });
        }
        if (detail.shippingTotal > 0) {
          summaryLines.push({ label: 'Shipping:', value: formatPrice(detail.shippingTotal) });
        }

        const config: PdfConfig = {
          title: 'ORDER INVOICE',
          orderNumber: detail.orderNumber,
          dateCreated: detail.dateCreated,
          total: detail.total,
          customer: detail.customer,
          products: detail.products,
          orderInfo,
          summaryLines,
          filename: `Order-Invoice-${detail.orderNumber}.pdf`,
        };

        const blob = this.pdfService.generateBlob(config);
        const filename = `Order-Invoice-${detail.orderNumber}.pdf`;
        const file = new File([blob], filename, { type: 'application/pdf' });

        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              text: `Hello ${detail.customer.name}, here is your Sellwin order #${detail.orderNumber} invoice.`,
            });
            this.sendingPdfId.set(null);
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
            const msg = `Hello ${detail.customer.name}, your Sellwin order #${detail.orderNumber} invoice is ready: ${res.url}`;
            this.utils.openWhatsApp(detail.customer.mobile, msg);
          },
          error: () => {
            this.sendingPdfId.set(null);
            this.utils.openWhatsApp(order.mobile);
            this.toast.add({ severity: 'warn', summary: 'PDF upload failed', detail: 'Sent text message instead', life: 5000 });
          },
        });
      },
      error: () => {
        this.sendingPdfId.set(null);
        this.utils.openWhatsApp(order.mobile);
        this.toast.add({ severity: 'warn', summary: 'Could not fetch order details', detail: 'Sent text message instead', life: 5000 });
      },
    });
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
