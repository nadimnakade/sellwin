import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import jsPDF from 'jspdf';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { OrderDetail, OrderItem } from '../../core/interfaces';
import { whatsappConfig, environment } from '../../../environments/environment';
import { CartSharedService } from './cart-shared.service';
import { CartBountyCart } from './abandoned-carts.component';
import html2canvas from 'html2canvas';
// import { NotoSansRegularBase64 } from '../../../assets/fonts/NotoSans-Regular-normal';
// import { NotoSansBoldBase64 } from '../../../assets/fonts/NotoSans-Bold';

// Register the fonts on the jsPDF API (so that every instance has them)
// @ts-ignore
// (jsPDF as any).API.addFileToVFS('NotoSans-Regular.ttf', NotoSansRegularBase64);
// // @ts-ignore
// (jsPDF as any).API.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
// // @ts-ignore
// (jsPDF as any).API.addFileToVFS('NotoSans-Bold.ttf', NotoSansBoldBase64);
// // @ts-ignore
// (jsPDF as any).API.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');

@Component({
  selector: 'app-cart-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="page-container">
      <div class="page-header">
        <div class="flex items-center gap-4">
          <a routerLink="/latest-carts" class="btn-ghost p-2" title="Back to carts">
            <i class="pi pi-arrow-left"></i>
          </a>
          <div>
            <h1 class="page-title">Cart #{{ cart()?.orderNumber }}</h1>
            <p class="text-surface-500 mt-1">{{ cart()?.dateCreated | date:'dd MMM yyyy, hh:mm a' }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (cart(); as c) {
            <button (click)="convertToOrder()" [disabled]="converting()" class="btn-primary">
              <i class="pi pi-shopping-bag"></i> {{ converting() ? 'Converting...' : 'Convert to Order' }}
            </button>
            <button (click)="downloadPdf()" class="btn-ghost">
              <i class="pi pi-file-pdf"></i> Download PDF
            </button>
       <button (click)="sendWhatsAppWithInvoice()"
                     [disabled]="!c.customer.mobile"
                     class="btn-ghost text-green-600 disabled:opacity-40">
               <i class="pi pi-whatsapp"></i> WhatsApp
             </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="glass-card p-6 space-y-4">
          @for (_ of [1,2,3,4,5]; track _) {
            <div class="skeleton-pulse h-5 w-3/4"></div>
          }
        </div>
      } @else {
        @if (cart(); as c) {
        <div class="glass-card overflow-hidden">
          <div class="p-5 border-b border-surface-200 dark:border-surface-700 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-xl font-bold text-surface-900 dark:text-white">Cart #{{ c.orderNumber }}</h2>
                <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                  {{ c.status || 'Active' }}
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <p class="text-xs font-semibold uppercase text-surface-400">Follow-up Status</p>
                  <div class="mt-2 flex items-center gap-2">
                    <select [(ngModel)]="selectedStatus"
                            [disabled]="savingStatus()"
                            class="input-field min-w-[170px]">
                      @for (status of statusOptions; track status.value) {
                        <option [value]="status.value">{{ status.label }}</option>
                      }
                    </select>
                    
                    <button (click)="saveStatus()"
                            [disabled]="savingStatus() || selectedStatus === c.status"
                            class="btn-primary disabled:opacity-40">
                      {{ savingStatus() ? 'Saving...' : 'Update' }}
                    </button>
                  </div>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase text-surface-400">Cart Date</p>
                  <p class="text-sm font-medium text-surface-900 dark:text-white mt-2">{{ c.dateCreated | date:'dd MMM yyyy, hh:mm a' }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase text-surface-400">Customer Details</p>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span class="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-semibold">
                      {{ c.customer.mobile || 'No mobile' }}
                      @if (c.customer.mobile) { <i class="pi pi-phone text-xs"></i> }
                    </span>
                    <span class="text-sm text-surface-500">{{ c.customer.email || 'No email' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <a [href]="'tel:' + c.customer.mobile" class="btn-ghost" [class.pointer-events-none]="!c.customer.mobile">
                <i class="pi pi-phone"></i> Contact
              </a>
              <button (click)="downloadPdf()" class="btn-ghost">
                <i class="pi pi-download"></i> Download PDF
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-[1fr_360px]">
            <div class="overflow-x-auto">
              <table class="w-full" id="cart-table">
                <thead>
                  <tr class="border-b border-surface-200 dark:border-surface-700">
                    <th class="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Title</th>                    
                    <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Price</th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Qty</th>
                    <th class="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of c.products; track item.productId) {
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
                <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Cart Summary</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between"><span class="text-surface-500">Items</span><span>{{ c.products.length }}</span></div>
                  <div class="flex justify-between pt-3 border-t border-surface-200 dark:border-surface-700 text-lg font-bold">
                    <span>Total</span><span>{{ utils.formatCurrency(c.total) }}</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Customer Information</h3>
                <div class="text-sm text-surface-700 dark:text-surface-300 space-y-1">
                  <p class="font-semibold text-surface-900 dark:text-white">{{ c.billing.firstName }} {{ c.billing.lastName }}</p>
                  <p>{{ c.customer.mobile || 'No mobile' }}</p>
                  <p>{{ c.customer.email || 'No email' }}</p>
                </div>
              </section>

              @if (c.note) {
                <section>
                  <h3 class="text-xs font-semibold uppercase text-surface-400 mb-3">Note</h3>
                  <p class="text-sm text-surface-700 dark:text-surface-300">{{ c.note }}</p>
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
export class CartDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(MessageService);
  private cartShared = inject(CartSharedService);
  utils = inject(UtilsService);

  whatsappMsg = whatsappConfig.followUpMessage;

  loading = signal(true);
  savingStatus = signal(false);
  converting = signal(false);
  cart = signal<OrderDetail | null>(null);
  selectedStatus = '';

  statusOptions = [
    { value: '', label: 'Select...' },
    { value: 'pending', label: 'Pending' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'converted', label: 'Converted' },
    { value: 'closed', label: 'Closed' },
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) return;

    // First, try to get cart from shared service (has prices from list)
    const sharedCart = this.cartShared.getCart();
    if (sharedCart?.id == id) {
      debugger;
      this.cart.set(this.mapSharedCartToOrderDetail(sharedCart));
      this.selectedStatus = sharedCart.contacted_status || '';
      this.loading.set(false);
    }

    // Then fetch full detail from API (has imageBase64 for PDF)
    // this.api.getCartDetail(id).subscribe({
    //   next: (res) => {
    //     this.cart.set(res);
    //     this.selectedStatus = res.status;
    //   },
    //   error: () => {},
    //   complete: () => this.loading.set(false),
    // });
  }

  private mapSharedCartToOrderDetail(cart: CartBountyCart): OrderDetail {
    return {
      id: cart.id,
      orderNumber: 'C' + cart.id,
      status: cart.contacted_status || 'pending',
      currency: cart.currency,
      dateCreated: cart.time,
      datePaid: '',
      paymentMethod: '',
      customer: {
        name: (cart.name + ' ' + cart.surname).trim() || 'Guest',
        mobile: cart.phone || '',
        email: cart.email || '',
      },
      billing: {
        firstName: cart.name || '',
        lastName: cart.surname || '',
        mobile: cart.phone || '',
        email: cart.email || '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
      },
      shipping: {
        firstName: '',
        lastName: '',
        mobile: '',
        email: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postcode: '',
        country: '',
      },
      products: cart.products.map(p => ({
        productId: p.product_id,
        name: p.title,
        sku: p.sku,
        quantity: p.quantity,
        price: p.price,
        subtotal: p.subtotal || p.price * p.quantity,
        image: p.thumbnail,
        imageBase64: p.imageBase64,
      })),
      subtotal: cart.cart_total,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      total: cart.cart_total,
      note: '',
    };
  }

  

  downloadPdf(): void {
    const order = this.cart();
    if (!order) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = margin;

    const font = 'helvetica';
    const dark: [number, number, number] = [23, 23, 23];
    const gray: [number, number, number] = [140, 140, 140];
    const lightBg: [number, number, number] = [245, 245, 245];
    const border: [number, number, number] = [225, 225, 225];

    // Cols matching web table: Title(img+name+id) | SKU | Price | Qty | Total
    const colX = [margin, margin + 90, margin + 115, margin + 140, margin + 160];
    const colW = [90, 25, 25, 20, contentW - 160];

    const formatDate = (dateStr: string): string => {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    // --- Cart header: Cart # + date ---
    const drawHeader = (): void => {
      y = margin;
      pdf.setFont(font, 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(...dark);
      pdf.text(`Cart #${order.orderNumber}`, margin, y + 6);

      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...gray);
      pdf.text(formatDate(order.dateCreated), margin, y + 12);
      y += 20;

      // customer details row
      pdf.setFont(font, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...gray);
      pdf.text('CUSTOMER DETAILS', margin, y);
      y += 5;
      pdf.setFont(font, 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...dark);
      //const custLine = [order.customerName, order.phone, order.email].filter(Boolean).join('   ');
      //pdf.text(custLine || '-', margin, y);
      //y += 10;
    };

    const drawTableHeader = (): void => {
      pdf.setFillColor(30, 30, 30);
      pdf.rect(margin, y, contentW, 8, 'F');
      pdf.setFont(font, 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TITLE', colX[0] + 2, y + 5.5);
      pdf.text('SKU', colX[1] + 2, y + 5.5);
      pdf.text('PRICE', colX[2] + colW[2] - 2, y + 5.5, { align: 'right' });
      pdf.text('QTY', colX[3] + colW[3] / 2, y + 5.5, { align: 'center' });
      pdf.text('TOTAL', colX[4] + colW[4] - 2, y + 5.5, { align: 'right' });
      y += 8;
    };

    const drawRow = (item: OrderItem, index: number, imgDataUrl: string | null): number => {
      const rowH = 20;

      if (index % 2 === 0) {
        pdf.setFillColor(...lightBg);
        pdf.rect(margin, y, contentW, rowH, 'F');
      }
      pdf.setDrawColor(...border);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + rowH, margin + contentW, y + rowH);

      // image
      if (imgDataUrl) {
        try {
          const format = imgDataUrl.startsWith('data:image/png') ? 'PNG' :
            imgDataUrl.startsWith('data:image/webp') ? 'WEBP' : 'JPEG';
          pdf.addImage(imgDataUrl, format, colX[0] + 2, y + 3, 14, 14, undefined, 'FAST');
        } catch { }
      }

      // title + product id
      pdf.setFont(font, 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(...dark);
      const nameLines = pdf.splitTextToSize(item.name, colW[0] - 20);
      pdf.text(nameLines.slice(0, 2), colX[0] + 20, y + 6);

      if (item.productId) {
        pdf.setFont(font, 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(...gray);
        pdf.text(`Product ID: ${item.productId}`, colX[0] + 20, y + 16);
      }

      // // SKU
      // pdf.setFont(font, 'normal');
      // pdf.setFontSize(7.5);
      // pdf.setTextColor(...gray);
      // pdf.text(item.sku || 'N/A', colX[1] + 2, y + rowH / 2 + 1);
      
      // Price (unit) — uses font with ₹ glyph
      pdf.setFont('Aerial', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(90, 90, 90);
      const unitPrice = item.price;
      pdf.text(this.utils.formatCurrency(unitPrice), colX[2] + colW[2] - 2, y + rowH / 2 + 1, { align: 'right' });

      // Qty
      pdf.setFont(font, 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...dark);
      pdf.text(String(item.quantity), colX[3] + colW[3] / 2, y + rowH / 2 + 1, { align: 'center' });

      // Total
      pdf.setFont('Aerial', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(...dark);
      pdf.text(this.utils.formatCurrency(item.price * item.quantity), colX[4] + colW[4] - 4, y + rowH / 2 + 1, { align: 'center' });

      return rowH;
    };

    const drawGrandTotal = (): void => {
      y += 8;
      pdf.setDrawColor(30, 30, 30);
      pdf.setLineWidth(0.4);
      pdf.line(margin + contentW - 70, y, margin + contentW, y);
      y += 6;

      pdf.setFont(font, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...gray);
      pdf.text('Items', margin + contentW - 70, y);
      pdf.setTextColor(...dark);
      pdf.text(String(order.products.length), margin + contentW - 2, y, { align: 'right' });
      y += 8;

      pdf.setFont(font, 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(...dark);
      pdf.text('Total', margin + contentW - 70, y);
      pdf.setFont('Aerial', 'bold');
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
    order.products.forEach((item, i) => {
      checkPage(20);
      const rh = drawRow(item, i, item.imageBase64);
      y += rh;
    });
    checkPage(20);
    drawGrandTotal();
    pdf.save(`Invoice-${order.orderNumber}.pdf`);
  }


  saveStatus(): void {
    const current = this.cart();
    if (!current || this.selectedStatus === current.status) return;
    this.savingStatus.set(true);
    this.api.updateCartStatus(current.id, this.selectedStatus).subscribe({
      next: () => {
        this.cart.set({ ...current, status: this.selectedStatus });
        this.savingStatus.set(false);
        this.toast.add({ severity: 'success', summary: 'Updated', detail: `Status set to ${this.selectedStatus || 'Pending'}`, life: 3000 });
      },
      error: (err) => {
        this.savingStatus.set(false);
        this.toast.add({ severity: 'error', summary: 'Failed', detail: err?.error?.message || 'Could not update status', life: 5000 });
      },
    });
  }

  getInvoiceUrl(): string {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return `${environment.siteUrl}/wp-json/sellwin/v1/cart/${id}/invoice`;
  }

  sendWhatsAppWithInvoice(): void {
    const c = this.cart();
    if (!c?.customer.mobile) return;
    const invoiceUrl = this.getInvoiceUrl();
    const msg = `Hi ${c.customer.name || 'there'}, view your Sellwin cart invoice here: ${invoiceUrl}`;
    this.utils.openWhatsApp(c.customer.mobile, msg);
  }

  convertToOrder(): void {
    const current = this.cart();
    if (!current || this.converting()) return;
    if (!confirm('Create a WooCommerce order from this cart?')) return;

    this.converting.set(true);
    this.api.convertCartToOrder(current.id).subscribe({
      next: (res) => {
        this.converting.set(false);
        this.toast.add({ severity: 'success', summary: 'Order Created', detail: `Order #${res.orderNumber} created`, life: 3000 });
        //this.downloadPdf();
        // if (current.customer.mobile) {
        //   const invoiceUrl = `${environment.siteUrl}/wp-json/sellwin/v1/order/${res.order_id}/invoice`;
        //   const msg = `Hi ${current.customer.name}, your Sellwin order #${res.orderNumber} has been created! Total: ${this.utils.formatCurrency(current.total)}. View invoice: ${invoiceUrl}`;
        //   this.utils.openWhatsApp(current.customer.mobile, msg);
        // }
        setTimeout(() => {
          this.cartShared.clearCart();
          this.router.navigate(['/latest-carts']);
        }, 5000)

      },
      error: (err) => {
        this.converting.set(false);
        this.toast.add({ severity: 'error', summary: 'Failed', detail: err?.error?.message || 'Could not convert cart to order', life: 5000 });
      },
    });
  }
}
