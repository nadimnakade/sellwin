import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { PdfService, PdfConfig } from '../../core/services/pdf.service';
import { OrderDetail, OrderItem } from '../../core/interfaces';
import { whatsappConfig, environment } from '../../../environments/environment';
import { CartSharedService } from './cart-shared.service';
import { CartBountyCart } from './abandoned-carts.component';

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
                      [disabled]="!c.customer.mobile || sendingPdf()"
                      class="btn-ghost text-green-600 disabled:opacity-40">
                @if (sendingPdf()) {
                  <i class="pi pi-spin pi-spinner"></i>
                } @else {
                  <i class="pi pi-whatsapp"></i>
                }
                {{ sendingPdf() ? 'Sending...' : 'WhatsApp' }}
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
  private pdfService = inject(PdfService);
  utils = inject(UtilsService);

  whatsappMsg = whatsappConfig.followUpMessage;

  loading = signal(true);
  savingStatus = signal(false);
  converting = signal(false);
  sendingPdf = signal(false);
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

    this.pdfService.generate({
      title: 'CART INVOICE',
      orderNumber: order.orderNumber,
      dateCreated: order.dateCreated,
      total: order.total,
      customer: order.customer,
      products: order.products,
      filename: `Cart-Invoice-${order.orderNumber}.pdf`,
    });
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
    this.sendingPdf.set(true);

    const config: PdfConfig = {
      title: 'CART INVOICE',
      orderNumber: c.orderNumber,
      dateCreated: c.dateCreated,
      total: c.total,
      customer: c.customer,
      products: c.products,
      filename: `Cart-Invoice-${c.orderNumber}.pdf`,
    };

    const blob = this.pdfService.generateBlob(config);
    const filename = `Cart-Invoice-${c.orderNumber}.pdf`;

    this.api.uploadPdf(blob, filename).subscribe({
      next: (res) => {
        this.sendingPdf.set(false);
        const msg = `Hi ${c.customer.name}, your Sellwin cart invoice is ready: ${res.url}`;
        this.utils.openWhatsApp(c.customer.mobile, msg);
        this.api.markWhatsAppContacted(c.id).subscribe();
      },
      error: () => {
        this.sendingPdf.set(false);
        const invoiceUrl = this.getInvoiceUrl();
        const msg = `Hi ${c.customer.name}, view your Sellwin cart invoice here: ${invoiceUrl}`;
        this.utils.openWhatsApp(c.customer.mobile, msg);
        this.toast.add({ severity: 'warn', summary: 'PDF upload failed', detail: 'Sent invoice link instead', life: 5000 });
      },
    });
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
