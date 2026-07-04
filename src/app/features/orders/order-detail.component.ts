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
                    <th></th>
                    <th class="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Title</th>                    
                    <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Price</th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Qty</th>
                    <th class="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of o.products; track item.productId) {
                    <tr class="border-b border-surface-100 dark:border-surface-800">
                    <td class="px-5 py-4"> 
                    <div class="w-14 h-14 rounded-lg bg-surface-100 dark:bg-surface-800 overflow-hidden flex items-center justify-center border border-surface-200 dark:border-surface-700">
                            @if (item.image) {
                              <img [src]="item.image" [alt]="item.name" class="w-full h-full object-cover">
                            } @else {
                              <i class="pi pi-box text-surface-400"></i>
                            }
                          </div>
                    </td>
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-3">                          
                          <div>
                            <p class="text-sm font-semibold text-surface-900 dark:text-white">{{ item.name }}</p>                            
                          </div>
                        </div>
                      </td>                      
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
      this.api.getSellwinOrder(id).subscribe({
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
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const font = 'helvetica';
    const dark: [number, number, number] = [23, 23, 23];
    const gray: [number, number, number] = [100, 100, 100];
    const lightBg: [number, number, number] = [250, 250, 250];
    const border: [number, number, number] = [230, 230, 230];
    const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
    const successColor: [number, number, number] = [34, 197, 94]; // Green

    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatPrice = (price: number): string => {
      return `Rs ${price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // --- Header: Store Name + Invoice Title ---
    const drawHeader = (): void => {
      y = margin;

      // Store/Company Name
      pdf.setFont(font, 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...primaryColor);
      pdf.text('SELLWIN', margin, y + 7);

      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...gray);
      pdf.text('Wholesale Mobile Accessories', margin, y + 13);

      // Invoice title on right
      pdf.setFont(font, 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(...dark);
      pdf.text('ORDER INVOICE', pageW - margin, y + 7, { align: 'right' });

      pdf.setFont(font, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...gray);
      pdf.text(`#${order.orderNumber}`, pageW - margin, y + 13, { align: 'right' });
      pdf.setFontSize(8);
      pdf.text(formatDate(order.dateCreated), pageW - margin, y + 18, { align: 'right' });

      y += 25;

      // Divider line
      pdf.setDrawColor(...border);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      // Two column layout: Customer Details | Order Info
      const col2X = margin + 95;

      // Left: Customer Details
      pdf.setFont(font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text('CUSTOMER DETAILS', margin, y);

      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      let leftY = y + 6;

      if (order.customer?.name) {
        pdf.setTextColor(...dark);
        pdf.text(order.customer.name, margin, leftY);
        leftY += 5;
      }

      if (order.customer?.email) {
        pdf.setTextColor(...gray);
        pdf.text(`Email: ${order.customer.email}`, margin, leftY);
        leftY += 5;
      }

      if (order.customer?.mobile) {
        pdf.setTextColor(...gray);
        pdf.text(`Phone: ${order.customer.mobile}`, margin, leftY);
        leftY += 5;
      }

      // Right: Order Info
      pdf.setFont(font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text('ORDER INFO', col2X, y);

      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      let rightY = y + 6;

      pdf.setTextColor(...gray);
      pdf.text(`Status: `, col2X, rightY);
      pdf.setTextColor(...successColor);
      pdf.setFont(font, 'bold');
      pdf.text(this.utils.getStatusLabel(order.status), col2X + 15, rightY);
      pdf.setFont(font, 'normal');
      rightY += 5;

      if (order.paymentMethod) {
        pdf.setTextColor(...gray);
        pdf.text(`Payment: ${order.paymentMethod}`, col2X, rightY);
        rightY += 5;
      }

      if (order.datePaid) {
        pdf.setTextColor(...gray);
        pdf.text(`Paid: ${formatDate(order.datePaid)}`, col2X, rightY);
        rightY += 5;
      }

      y = Math.max(leftY, rightY) + 5;
    };

    const drawTableHeader = (): void => {
      // Dark header background
      pdf.setFillColor(30, 30, 30);
      pdf.rect(margin, y, contentW, 9, 'F');

      pdf.setFont(font, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);

      // Column headers
      pdf.text('PRODUCT', margin + 3, y + 6);
      // pdf.text('SKU', margin + 95, y + 6);
      pdf.text('PRICE', margin + 120, y + 6, { align: 'right' });
      pdf.text('QTY', margin + 145, y + 6, { align: 'center' });
      pdf.text('TOTAL', contentW + margin - 3, y + 6, { align: 'right' });

      y += 9;
    };

    const drawRow = (item: OrderItem, index: number, imgDataUrl: string | null): number => {
      const rowH = 22;

      // Alternating row background
      if (index % 2 === 1) {
        pdf.setFillColor(...lightBg);
        pdf.rect(margin, y, contentW, rowH, 'F');
      }

      // Bottom border
      pdf.setDrawColor(...border);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + rowH, margin + contentW, y + rowH);

      // Product image
      if (imgDataUrl) {
        try {
          const format = imgDataUrl.startsWith('data:image/png') ? 'PNG' :
            imgDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
          pdf.addImage(imgDataUrl, format, margin + 3, y + 4, 15, 15, undefined, 'FAST');
        } catch (e) {
          console.error('Image error:', e);
        }
      }

      // Product name
      pdf.setFont(font, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...dark);
      const nameLines = pdf.splitTextToSize(item.name, 68);
      pdf.text(nameLines.slice(0, 2), margin + 22, y + 7);

      // Product ID
      if (item.productId) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...gray);
        pdf.text(`ID: ${item.productId}`, margin + 22, y + 17);
      }

      // SKU
      // pdf.setFont(font, 'normal');
      // pdf.setFontSize(8);
      // pdf.setTextColor(...gray);
      // pdf.text(item.sku || '-', margin + 95, y + 12);

      // Price
      pdf.setFont(font, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...gray);
      pdf.text(formatPrice(item.price), margin + 120, y + 12, { align: 'right' });

      // Quantity
      pdf.setFont(font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text(String(item.quantity), margin + 145, y + 12, { align: 'center' });

      // Total
      pdf.setFont(font, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      pdf.text(formatPrice(item.subtotal), contentW + margin - 3, y + 12, { align: 'right' });

      return rowH;
    };

    const drawSummary = (): void => {
      y += 10;

      const summaryX = contentW + margin - 70;

      // Divider line above summary
      pdf.setDrawColor(...dark);
      pdf.setLineWidth(0.5);
      pdf.line(summaryX, y, contentW + margin, y);
      y += 8;

      // Subtotal
      if (order.subtotal !== order.total) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...gray);
        pdf.text('Subtotal:', summaryX, y);
        pdf.setTextColor(...dark);
        pdf.text(formatPrice(order.subtotal), contentW + margin - 3, y, { align: 'right' });
        y += 6;
      }

      // Discount
      if (order.discountTotal > 0) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...gray);
        pdf.text('Discount:', summaryX, y);
        pdf.setTextColor(...successColor);
        pdf.text(`-${formatPrice(order.discountTotal)}`, contentW + margin - 3, y, { align: 'right' });
        y += 6;
      }

      // Tax
      if (order.taxTotal > 0) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...gray);
        pdf.text('Tax:', summaryX, y);
        pdf.setTextColor(...dark);
        pdf.text(formatPrice(order.taxTotal), contentW + margin - 3, y, { align: 'right' });
        y += 6;
      }

      // Shipping
      if (order.shippingTotal > 0) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...gray);
        pdf.text('Shipping:', summaryX, y);
        pdf.setTextColor(...dark);
        pdf.text(formatPrice(order.shippingTotal), contentW + margin - 3, y, { align: 'right' });
        y += 6;
      }

      // Items count
      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...gray);
      pdf.text('Total Items:', summaryX, y);
      pdf.setTextColor(...dark);
      pdf.text(String(order.products.length), contentW + margin - 3, y, { align: 'right' });
      y += 10;

      // Grand Total
      pdf.setFont(font, 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(...dark);
      pdf.text('TOTAL:', summaryX, y);
      pdf.setFontSize(14);
      pdf.setTextColor(...primaryColor);
      pdf.text(formatPrice(order.total), contentW + margin - 3, y, { align: 'right' });
      y += 10;

      // Final divider
      pdf.setDrawColor(...dark);
      pdf.setLineWidth(0.5);
      pdf.line(summaryX, y, contentW + margin, y);
    };

    const drawFooter = (): void => {
      y += 15;
      pdf.setFont(font, 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(...gray);
      pdf.text('Thank you for your business!', pageW / 2, y, { align: 'center' });
      y += 5;
      pdf.text('For queries, contact us via WhatsApp or call.', pageW / 2, y, { align: 'center' });
    };

    const checkPage = (needed: number): void => {
      if (y + needed > 270) {
        pdf.addPage();
        y = margin;
        drawTableHeader();
      }
    };

    // Generate PDF
    drawHeader();
    drawTableHeader();

    order.products.forEach((item, i) => {
      checkPage(25);
      const rh = drawRow(item, i, item.imageBase64);
      y += rh;
    });

    checkPage(60);
    drawSummary();
    drawFooter();

    pdf.save(`Order-Invoice-${order.orderNumber}.pdf`);
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
