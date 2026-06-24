import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { OrderDetail } from '../../core/interfaces';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="flex items-center gap-4">
          <a routerLink="/orders" class="btn-ghost p-2" title="Back to orders">
            <i class="pi pi-arrow-left"></i>
          </a>
          <div>
            <h1 class="page-title">Order #{{ order()?.orderNumber }}</h1>
            <p class="text-surface-500 mt-1">{{ order()?.dateCreated | date:'dd MMM yyyy, hh:mm a' }}</p>
          </div>
        </div>
        @if (order(); as o) {
          <div class="flex flex-wrap items-center gap-2">
            <button (click)="downloadPdf()" class="btn-ghost">
              <i class="pi pi-file-pdf"></i> Download PDF
            </button>
            <button (click)="utils.openWhatsApp(o.customer.mobile, getWhatsAppMessage(o))"
                    [disabled]="!o.customer.mobile"
                    class="btn-ghost text-green-600 disabled:opacity-40">
              <i class="pi pi-whatsapp"></i> WhatsApp
            </button>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="glass-card p-6 space-y-4">
          @for (_ of [1,2,3,4,5]; track _) {
            <div class="skeleton-pulse h-5 w-3/4"></div>
          }
        </div>
      } @else {
        @if (order(); as o) {
        <div class="glass-card overflow-hidden">
          <div class="p-5 border-b border-surface-200 dark:border-surface-700 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-xl font-bold text-surface-900 dark:text-white">Order #{{ o.orderNumber }}</h2>
                <span [class]="utils.getStatusClass(o.status)">{{ utils.getStatusLabel(o.status) }}</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <p class="text-xs font-semibold uppercase text-surface-400">Order Status</p>
                  <div class="mt-2 flex items-center gap-2">
                    <select [(ngModel)]="selectedStatus"
                            [disabled]="savingStatus()"
                            class="input-field min-w-[170px]">
                      @for (status of statusOptions; track status.value) {
                        <option [value]="status.value">{{ status.label }}</option>
                      }
                    </select>
                    <button (click)="saveStatus()"
                            [disabled]="savingStatus() || selectedStatus === o.status"
                            class="btn-primary disabled:opacity-40">
                      {{ savingStatus() ? 'Saving...' : 'Update' }}
                    </button>
                  </div>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase text-surface-400">Order Date</p>
                  <p class="text-sm font-medium text-surface-900 dark:text-white mt-2">{{ o.dateCreated | date:'dd MMM yyyy, hh:mm a' }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase text-surface-400">Customer Details</p>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-semibold">
                      {{ o.customer.mobile || 'No mobile' }}
                      @if (o.customer.mobile) { <i class="pi pi-phone text-xs"></i> }
                    </span>
                    <span class="text-sm text-surface-500">{{ o.customer.email || 'No email' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <a [href]="'tel:' + o.customer.mobile" class="btn-ghost" [class.pointer-events-none]="!o.customer.mobile">
                <i class="pi pi-phone"></i> Contact Buyer
              </a>
              <button (click)="downloadPdf()" class="btn-ghost">
                <i class="pi pi-download"></i> Download PDF
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px]">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-surface-200 dark:border-surface-700">
                    <th class="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Title</th>
                    <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">SKU</th>
                    <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Price</th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Qty</th>
                    <th class="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of o.products; track item.productId) {
                    <tr class="border-b border-surface-100 dark:border-surface-800">
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-3">
                          <div class="w-14 h-14 rounded-lg bg-surface-100 dark:bg-surface-800 overflow-hidden flex items-center justify-center border border-surface-200 dark:border-surface-700">
                            @if (item.image) {
                              <img [src]="item.image" [alt]="item.name" class="w-full h-full object-cover">
                            } @else {
                              <i class="pi pi-box text-surface-400"></i>
                            }
                          </div>
                          <div>
                            <p class="text-sm font-semibold text-surface-900 dark:text-white">{{ item.name }}</p>
                            <p class="text-xs text-surface-400">Product ID: {{ item.productId }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="px-4 py-4 text-sm text-surface-500">{{ item.sku || 'N/A' }}</td>
                      <td class="px-4 py-4 text-sm text-right text-surface-700 dark:text-surface-300">{{ utils.formatCurrency(item.price) }}</td>
                      <td class="px-4 py-4 text-sm text-center font-semibold text-surface-900 dark:text-white">{{ item.quantity }}</td>
                      <td class="px-5 py-4 text-sm text-right font-bold text-surface-900 dark:text-white">{{ utils.formatCurrency(item.subtotal) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <aside class="border-t xl:border-t-0 xl:border-l border-surface-200 dark:border-surface-700 p-5 space-y-5 bg-surface-50/70 dark:bg-surface-900/40">
              <section>
                <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Order Summary</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between"><span class="text-surface-500">Items</span><span>{{ o.products.length }}</span></div>
                  <div class="flex justify-between"><span class="text-surface-500">Subtotal</span><span>{{ utils.formatCurrency(o.subtotal) }}</span></div>
                  @if (o.discountTotal) {
                    <div class="flex justify-between text-green-600"><span>Discount</span><span>-{{ utils.formatCurrency(o.discountTotal) }}</span></div>
                  }
                  @if (o.taxTotal) {
                    <div class="flex justify-between"><span class="text-surface-500">Tax</span><span>{{ utils.formatCurrency(o.taxTotal) }}</span></div>
                  }
                  <div class="flex justify-between"><span class="text-surface-500">Shipping</span><span>{{ utils.formatCurrency(o.shippingTotal) }}</span></div>
                  <div class="flex justify-between pt-3 border-t border-surface-200 dark:border-surface-700 text-lg font-bold">
                    <span>Total</span><span>{{ utils.formatCurrency(o.total) }}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Payment Details</h3>
                <p class="text-sm font-medium text-surface-900 dark:text-white">{{ o.paymentMethod || 'N/A' }}</p>
                <p class="text-xs text-surface-400 mt-1">Paid: {{ o.datePaid ? (o.datePaid | date:'dd MMM yyyy, hh:mm a') : 'N/A' }}</p>
              </section>

              <section>
                <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Billing Information</h3>
                <div class="text-sm text-surface-700 dark:text-surface-300 space-y-1">
                  <p class="font-semibold text-surface-900 dark:text-white">{{ o.billing.firstName }} {{ o.billing.lastName }}</p>
                  <p>{{ o.billing.mobile || o.customer.mobile }}</p>
                  <p>{{ o.billing.email || o.customer.email }}</p>
                  <p>{{ formatAddress(o.billing) }}</p>
                </div>
              </section>

              <section>
                <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Shipping Information</h3>
                <div class="text-sm text-surface-700 dark:text-surface-300 space-y-1">
                  <p class="font-semibold text-surface-900 dark:text-white">{{ o.shipping.firstName || o.billing.firstName }} {{ o.shipping.lastName || o.billing.lastName }}</p>
                  <p>{{ formatAddress(o.shipping.address1 ? o.shipping : o.billing) || 'Same as billing' }}</p>
                </div>
              </section>

              @if (o.note) {
                <section>
                  <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Customer Note</h3>
                  <p class="text-sm text-surface-700 dark:text-surface-300">{{ o.note }}</p>
                </section>
              }
            </aside>
          </div>
        </div>
        }
      }
    </div>
  `,
})
export class OrderDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  utils = inject(UtilsService);

  loading = signal(true);
  savingStatus = signal(false);
  order = signal<OrderDetail | null>(null);
  selectedStatus = '';

  statusOptions = [
    { value: 'pending', label: 'Pending payment' },
    { value: 'processing', label: 'Processing' },
    { value: 'on-hold', label: 'On hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'failed', label: 'Failed' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.api.getOrder(id).subscribe({
        next: (res) => {
          this.order.set(res);
          this.selectedStatus = res.status;
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  saveStatus(): void {
    const current = this.order();
    if (!current || this.selectedStatus === current.status) return;
    this.savingStatus.set(true);
    this.api.updateOrderStatus(current.id, this.selectedStatus).subscribe({
      next: (res) => {
        this.order.set(res);
        this.selectedStatus = res.status;
        this.savingStatus.set(false);
      },
      error: () => this.savingStatus.set(false),
    });
  }

  downloadPdf(): void {
    const current = this.order();
    if (!current) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800');
    if (!popup) return;
    popup.document.write(this.buildPrintableOrder(current));
    popup.document.close();
    popup.onload = () => {
      popup.document.title = `Order-${current.orderNumber}.pdf`;
      popup.focus();
      popup.print();
    };
  }

  getWhatsAppMessage(order: OrderDetail): string {
    return `Hello ${order.customer.name}, sharing details for your Sellwin order #${order.orderNumber}. Total: ${this.utils.formatCurrency(order.total)}.`;
  }

  formatAddress(address: any): string {
    return [
      address.address1,
      address.address2,
      address.city,
      address.state,
      address.postcode,
      address.country,
    ].filter(Boolean).join(', ');
  }

  private buildPrintableOrder(order: OrderDetail): string {
    const rows = order.products.map((item) => `
      <tr>
        <td>
          <div class="product">
            ${item.image ? `<img src="${item.image}" alt="">` : '<div class="placeholder">No image</div>'}
            <div><strong>${this.escape(item.name)}</strong><br><small>SKU: ${this.escape(item.sku || 'N/A')}</small></div>
          </div>
        </td>
        <td>${item.quantity}</td>
        <td>${this.utils.formatCurrency(item.price)}</td>
        <td>${this.utils.formatCurrency(item.subtotal)}</td>
      </tr>
    `).join('');

    return `<!doctype html>
      <html>
        <head>
          <title>Order-${this.escape(order.orderNumber)}.pdf</title>
          <style>
            body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:28px;background:#fff}
            .top{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111827;padding-bottom:16px}
            h1{margin:0;font-size:28px}.muted{color:#6b7280}.badge{display:inline-block;background:#eef2ff;color:#3730a3;border-radius:999px;padding:5px 10px;font-size:12px;text-transform:uppercase}
            .grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin:22px 0}.box{border:1px solid #e5e7eb;border-radius:10px;padding:14px}.box h3{font-size:12px;color:#6b7280;text-transform:uppercase;margin:0 0 10px}
            table{width:100%;border-collapse:collapse;margin-top:18px}th{font-size:12px;text-align:left;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding:10px}td{border-bottom:1px solid #f3f4f6;padding:12px 10px;vertical-align:middle}td:nth-child(n+2),th:nth-child(n+2){text-align:right}
            .product{display:flex;align-items:center;gap:12px}.product img,.placeholder{width:54px;height:54px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb}.placeholder{display:flex;align-items:center;justify-content:center;font-size:10px;color:#9ca3af}
            .totals{margin-left:auto;width:320px;margin-top:18px}.line{display:flex;justify-content:space-between;padding:7px 0}.total{font-weight:700;font-size:20px;border-top:2px solid #111827;margin-top:8px;padding-top:12px}
            @media print{button{display:none}body{padding:0}.box{break-inside:avoid}.product img{print-color-adjust:exact}}
          </style>
        </head>
        <body>
          <div class="top">
            <div><h1>Order #${this.escape(order.orderNumber)}</h1><p class="muted">${new Date(order.dateCreated).toLocaleString('en-IN')}</p></div>
            <div style="text-align:right"><div class="badge">${this.escape(this.utils.getStatusLabel(order.status))}</div><h2>${this.utils.formatCurrency(order.total)}</h2></div>
          </div>
          <div class="grid">
            <div class="box"><h3>Customer Details</h3><strong>${this.escape(order.customer.name)}</strong><br>${this.escape(order.customer.mobile)}<br>${this.escape(order.customer.email || 'N/A')}</div>
            <div class="box"><h3>Billing Address</h3>${this.escape(this.formatAddress(order.billing))}</div>
            <div class="box"><h3>Shipping Address</h3>${this.escape(this.formatAddress(order.shipping.address1 ? order.shipping : order.billing) || 'Same as billing')}</div>
          </div>
          <div class="grid">
            <div class="box"><h3>Payment</h3>${this.escape(order.paymentMethod || 'N/A')}<br><span class="muted">Paid: ${order.datePaid ? new Date(order.datePaid).toLocaleString('en-IN') : 'N/A'}</span></div>
            <div class="box"><h3>Order Date</h3>${new Date(order.dateCreated).toLocaleString('en-IN')}</div>
            <div class="box"><h3>Customer Note</h3>${this.escape(order.note || 'N/A')}</div>
          </div>
          <table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="totals">
            <div class="line"><span>Subtotal</span><span>${this.utils.formatCurrency(order.subtotal)}</span></div>
            <div class="line"><span>Discount</span><span>-${this.utils.formatCurrency(order.discountTotal)}</span></div>
            <div class="line"><span>Tax</span><span>${this.utils.formatCurrency(order.taxTotal)}</span></div>
            <div class="line"><span>Shipping</span><span>${this.utils.formatCurrency(order.shippingTotal)}</span></div>
            <div class="line total"><span>Total</span><span>${this.utils.formatCurrency(order.total)}</span></div>
          </div>
        </body>
      </html>`;
  }

  private escape(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
