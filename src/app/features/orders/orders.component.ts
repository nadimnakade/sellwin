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
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="page-title">Orders</h1>
          <p class="text-surface-500 mt-1 text-sm">Manage and view all WooCommerce orders</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-surface-400">{{ totalOrders() }} orders</span>
          <button (click)="exportCsv()" class="btn-ghost text-sm" [disabled]="!orders().length">
            <i class="pi pi-download"></i> <span class="hidden sm:inline">Export CSV</span>
          </button>
          <button (click)="refresh()" class="btn-ghost text-sm">
            <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="glass-card p-3 sm:p-4 mb-4 sm:mb-6">
        <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div class="relative flex-1 min-w-0 sm:min-w-[200px]">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm"></i>
            <input type="text" [value]="searchTerm()" (input)="searchTerm.set($any($event.target).value); loadOrders()"
                   placeholder="Search orders..." class="input-field pl-9 text-xs sm:text-sm">
          </div>
          <div class="flex gap-2">
            <select [value]="statusFilter()" (change)="statusFilter.set($any($event.target).value); loadOrders()"
                    class="input-field text-xs sm:text-sm min-w-0 w-full sm:w-auto sm:min-w-[150px]">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        @if (loading()) {
          <!-- Desktop skeleton -->
          <div class="p-4 sm:p-6 space-y-4 hidden md:block">
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
          <!-- Mobile skeleton -->
          <div class="p-4 space-y-4 md:hidden">
            @for (_ of [1,2,3]; track _) {
              <div class="flex items-start gap-3">
                <div class="flex-1 space-y-2">
                  <div class="flex justify-between items-center">
                    <div class="skeleton-pulse h-4 w-16"></div>
                    <div class="skeleton-pulse h-5 w-16 rounded-full"></div>
                  </div>
                  <div class="skeleton-pulse h-4 w-32"></div>
                  <div class="skeleton-pulse h-3 w-24"></div>
                  <div class="flex justify-between items-center mt-2">
                    <div class="skeleton-pulse h-4 w-20"></div>
                    <div class="flex gap-1">
                      <div class="skeleton-pulse h-8 w-8 rounded-md"></div>
                      <div class="skeleton-pulse h-8 w-8 rounded-md"></div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (!orders().length) {
          <div class="text-center py-12 sm:py-16 text-surface-400">
            <i class="pi pi-shopping-cart text-3xl sm:text-4xl mb-4 block"></i>
            <p class="text-base sm:text-lg font-medium">No orders found</p>
            <p class="text-xs sm:text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        } @else {
          <!-- Desktop Table -->
          <div class="overflow-x-auto hidden md:block">
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

          <!-- Mobile Cards -->
          <div class="md:hidden divide-y divide-surface-100 dark:divide-surface-800">
            @for (order of orders(); track order.id) {
              <div class="p-4 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                <!-- Top: Order # + Status -->
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-surface-900 dark:text-white">#{{ order.orderNumber }}</span>
                  <span [class]="utils.getStatusClass(order.status)">{{ utils.getStatusLabel(order.status) }}</span>
                </div>
                <!-- Customer + Mobile -->
                <div class="text-sm text-surface-700 dark:text-surface-300 mb-1">{{ order.customerName }}</div>
                <div class="text-xs text-surface-500 mb-3">{{ utils.formatIndianMobile(order.mobile) || '—' }}</div>
                <!-- Bottom: Amount + Date + Actions -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-bold text-surface-900 dark:text-white">{{ utils.formatCurrency(order.total) }}</span>
                    <span class="text-xs text-surface-400">{{ order.dateCreated | date:'dd MMM, hh:mm a' }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <a [routerLink]="['/orders', order.id]"
                       class="p-2 rounded-md text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                       title="View">
                      <i class="pi pi-eye"></i>
                    </a>
                    <button (click)="sendWhatsAppWithPdf(order)"
                            [disabled]="!order.mobile || sendingPdfId() === order.id"
                            class="p-2 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            [title]="order.mobile ? 'WhatsApp' : 'Phone number missing'">
                      @if (sendingPdfId() === order.id) {
                        <i class="pi pi-spin pi-spinner"></i>
                      } @else {
                        <i class="pi pi-whatsapp"></i>
                      }
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-surface-200 dark:border-surface-700">
            <span class="text-xs sm:text-sm text-surface-400">Page {{ currentPage() }} of {{ totalPages() }}</span>
            <div class="flex items-center gap-1 sm:gap-2">
              <button [disabled]="currentPage() <= 1" (click)="changePage(currentPage() - 1)"
                      class="btn-ghost p-1.5 disabled:opacity-30" [class.cursor-not-allowed]="currentPage() <= 1">
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
