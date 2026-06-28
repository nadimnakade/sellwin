import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import jsPDF from 'jspdf';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { OrderDetail, OrderItem } from '../../core/interfaces';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
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
        <div class="flex items-center gap-2">
          @if (order()?.status; as status) {
            <span [class]="utils.getStatusClass(status)">{{ utils.getStatusLabel(status) }}</span>
          }
          @if (order()) {
            <button (click)="downloadPdf()" class="btn-ghost">
              <i class="pi pi-file-pdf"></i>
              Download PDF
            </button>
          }
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
  private toast = inject(MessageService);
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

  downloadPdf(): void {
    const order = this.order();
    if (!order) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    const font = 'helvetica';
    const darkColor: [number, number, number] = [30, 30, 30];
    const grayColor: [number, number, number] = [100, 100, 100];

    // Columns: No(10) + Product(22) + Item(92) + Qty(14) + Amount(32) = 170
    const colX = [20, 30, 52, 144, 158];
    const colW = [10, 22, 92, 14, 32];

    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const drawHeader = (): void => {
      y = margin;

      pdf.setFillColor(30, 30, 30);
      pdf.roundedRect(margin, y, 14, 14, 3, 3, 'F');
      pdf.setFont(font, 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text('SW', margin + 7, y + 8.5, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setTextColor(...darkColor);
      pdf.text('SELLWIN', margin + 18, y + 10);

      y += 22;

      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...grayColor);
      pdf.text('Order Number:', margin, y);
      pdf.setTextColor(...darkColor);
      pdf.setFont(font, 'bold');
      pdf.text(String(order.orderNumber), margin + 28, y);

      pdf.setFont(font, 'normal');
      pdf.setTextColor(...grayColor);
      pdf.text('Order Date:', margin + 80, y);
      pdf.setTextColor(...darkColor);
      pdf.setFont(font, 'bold');
      pdf.text(formatDate(order.dateCreated), margin + 100, y);

      y += 10;
    };

    const drawTableHeader = (): void => {
      const headerH = 8;

      pdf.setFillColor(30, 30, 30);
      pdf.rect(margin, y, contentW, headerH, 'F');

      pdf.setFont(font, 'bold');
      pdf.setTextColor(255, 255, 255);

      // Header: No. | Product | Item | Qty | Amount
      pdf.setFontSize(7);
      pdf.text('No.', colX[0] + 3, y + 5.5);
      pdf.text('Product', colX[1] + 2, y + 5.5);
      pdf.text('Item', colX[2] + 2, y + 5.5);
      pdf.text('Qty', colX[3] + colW[3] / 2, y + 5.5, { align: 'center' });
      pdf.text('Amount', colX[4] + colW[4] - 2, y + 5.5, { align: 'right' });

      y += headerH;
    };

    const loadImage = (url: string): Promise<string | null> =>
    new Promise((resolve) => {

      if (!url) {
        resolve(null);
        return;
      }

      const img = new Image();

      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(null);
            return;
          }

          ctx.drawImage(img, 0, 0);

          resolve(canvas.toDataURL('image/jpeg', 0.95));

        } catch (e) {
          console.error('Canvas conversion failed', e);
          resolve(null);
        }
      };

      img.onerror = () => {
        console.error('Image failed:', url);
        resolve(null);
      };

      img.src = url;

    });
    // const loadImage = (url: string): Promise<string | null> =>
    //   new Promise((resolve) => {
    //     if (!url) return resolve(null);
    //     fetch(url)
    //       .then(res => res.ok ? res.blob() : null)
    //       .then(blob => {
    //         if (!blob) return resolve(null);
    //         const reader = new FileReader();
    //         reader.onloadend = () => resolve(reader.result as string);
    //         reader.onerror = () => resolve(null);
    //         reader.readAsDataURL(blob);
    //       })
    //       .catch(() => resolve(null));
    //   });

    const drawRow = (item: OrderItem, index: number, imgDataUrl: string | null): number => {
      const rowH = 22;
      const textY = y + 5;

      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, y, contentW, rowH, 'F');
      }

      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, y, contentW, rowH, 'S');

      // Column dividers
      [colX[1], colX[2], colX[3], colX[4]].forEach(cx => {
        pdf.line(cx, y, cx, y + rowH);
      });

      // No.
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...darkColor);
      pdf.text(String(index + 1), colX[0] + colW[0] / 2, y + rowH / 2 + 1, { align: 'center' });

      // Product image
      if (imgDataUrl) {
        try {

          const format = imgDataUrl.startsWith('data:image/png') ? 'PNG' :
                        imgDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';

          pdf.addImage(imgDataUrl,format,colX[1] + 1,y + 1,20,rowH - 2);
          //pdf.addImage(imgDataUrl, 'JPEG', colX[1] + 1, y + 1, 20, rowH - 2);
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.2);
          pdf.rect(colX[1] + 1, y + 1, 20, rowH - 2, 'S');
        } catch {
          // skip broken image
        }
      }

      // Item name
      pdf.setFont(font, 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(...darkColor);
      const maxNameW = colW[2] - 4;
      const nameLines = pdf.splitTextToSize(item.name, maxNameW);
      pdf.text(nameLines[0] || item.name, colX[2] + 2, textY);

      // SKU
      if (item.sku) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...grayColor);
        const skuMax = pdf.splitTextToSize(item.sku, maxNameW);
        pdf.text(skuMax[0] || item.sku, colX[2] + 2, textY + 5);
      }

      // Qty
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...darkColor);
      pdf.text(String(item.quantity), colX[3] + colW[3] / 2, y + rowH / 2 + 1, { align: 'center' });

      // Amount
      pdf.setFontSize(7.5);
      const amt = this.utils.formatCurrency(item.subtotal);
      pdf.text(amt, colX[4] + colW[4] - 2, y + rowH / 2 + 1, { align: 'right' });

      return rowH;
    };

    const drawGrandTotal = (): void => {
      y += 1;
      pdf.setDrawColor(30, 30, 30);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 100, y, margin + contentW, y);
      y += 7;

      pdf.setFont(font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...darkColor);
      pdf.text('Grand Total', margin + 110, y);
      pdf.text(this.utils.formatCurrency(order.total), margin + contentW - 2, y, { align: 'right' });
    };

    const checkPage = (needed: number): void => {
      if (y + needed > 297 - margin) {
        pdf.addPage();
        y = margin;
        drawTableHeader();
      }
    };

    drawHeader();
    drawTableHeader();

    const loadAll = order.products.map(p => loadImage(p.image));
    Promise.all(loadAll).then(images => {
      images.forEach((img, i) => {
        checkPage(24);
        const rh = drawRow(order.products[i], i, img);
        y += rh;
      });

      checkPage(18);
      drawGrandTotal();

      pdf.save(`Order-${order.orderNumber}.pdf`);
    });
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
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${this.utils.getStatusLabel(res.status)}`, life: 3000 });
      },
      error: (err) => {
        this.savingStatus.set(false);
        this.toast.add({ severity: 'error', summary: 'Failed', detail: err?.error?.message || 'Could not update order status', life: 5000 });
      },
    });
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
}
