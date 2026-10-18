import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { PdfService, PdfConfig, buildPdfAddresses } from '../../core/services/pdf.service';
import { Address, OrderDetail, OrderItem } from '../../core/interfaces';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="w-full p-3 sm:p-5 lg:p-6 animate-fade-in">
      @if (loading()) {
        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
          <div class="glass-card p-6 space-y-4">
            @for (_ of [1,2,3,4,5]; track _) { <div class="skeleton-pulse h-12 w-full"></div> }
          </div>
          <div class="space-y-4">
            @for (_ of [1,2,3]; track _) { <div class="glass-card p-6"><div class="skeleton-pulse h-24 w-full"></div></div> }
          </div>
        </div>
      } @else {
      @if (order(); as o) {
        @let shipTo = getShippingAddress(o);

        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div class="flex items-center gap-4 min-w-0">
            <a routerLink="/orders" class="w-10 h-10 shrink-0 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 flex items-center justify-center text-surface-500 hover:text-primary-600 hover:border-primary-200 transition-colors" title="Back to orders">
              <i class="pi pi-arrow-left"></i>
            </a>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-white">Order #{{ o.orderNumber }}</h1>
                <span [class]="utils.getStatusClass(o.status)">{{ utils.getStatusLabel(o.status) }}</span>
              </div>
              <p class="mt-1.5 text-sm text-surface-500 flex items-center gap-2">
                <i class="pi pi-calendar text-xs"></i>
                {{ o.dateCreated | date:'dd MMM yyyy, hh:mm a' }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            <button (click)="downloadPdf()" class="btn-ghost justify-center whitespace-nowrap">
              <i class="pi pi-file-pdf"></i> Download PDF
            </button>
            <button (click)="sendWhatsAppWithPdf(o)" [disabled]="!o.customer.mobile || sendingPdf()" class="btn-ghost justify-center whitespace-nowrap text-green-600 disabled:opacity-40">
              <i [class]="sendingPdf() ? 'pi pi-spin pi-spinner' : 'pi pi-whatsapp'"></i>
              {{ sendingPdf() ? 'Sending...' : 'WhatsApp' }}
            </button>
            <a [href]="'tel:' + o.customer.mobile" class="btn-primary justify-center whitespace-nowrap" [class.pointer-events-none]="!o.customer.mobile">
              <i class="pi pi-phone"></i> Contact Buyer
            </a>
          </div>
        </div>

        <section class="glass-card-solid p-5 mb-5">
          <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-surface-200 dark:divide-surface-700">
            <div class="flex gap-4 pb-5 md:pb-0 md:pr-5">
              <div class="w-10 h-10 shrink-0 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center"><i class="pi pi-clock"></i></div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold text-surface-500 mb-2">Order Status</p>
                <div class="flex items-center gap-2">
                  <select [(ngModel)]="selectedStatus" [disabled]="savingStatus()" class="input-field min-w-0 flex-1">
                    @for (status of statusOptions; track status.value) { <option [value]="status.value">{{ status.label }}</option> }
                  </select>
                  <button (click)="saveStatus()" [disabled]="savingStatus() || selectedStatus === o.status" class="btn-primary shrink-0 disabled:opacity-40">
                    {{ savingStatus() ? 'Saving...' : 'Update' }}
                  </button>
                </div>
              </div>
            </div>
            <div class="flex gap-4 py-5 md:py-0 md:px-5">
              <div class="w-10 h-10 shrink-0 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center"><i class="pi pi-calendar"></i></div>
              <div><p class="text-xs font-semibold text-surface-500">Order Date</p><p class="mt-2 text-sm font-semibold text-surface-900 dark:text-white">{{ o.dateCreated | date:'dd MMM yyyy, hh:mm a' }}</p></div>
            </div>
            <div class="flex gap-4 pt-5 md:pt-0 md:pl-5">
              <div class="w-10 h-10 shrink-0 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 flex items-center justify-center"><i class="pi pi-user"></i></div>
              <div class="min-w-0"><p class="text-xs font-semibold text-surface-500">Customer</p>@if (o.customer.mobile) { <a [routerLink]="['/customers', customerRouteMobile(o.customer.mobile)]" class="mt-1.5 inline-block text-sm font-bold text-green-600 hover:underline">{{ o.customer.mobile }}</a> } @else { <p class="mt-1.5 text-sm font-bold text-surface-500">No mobile</p> }<p class="mt-1 text-xs text-surface-500 break-all">{{ o.customer.email || 'No email' }}</p></div>
            </div>
          </div>
        </section>

        <div class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
          <section class="glass-card-solid overflow-hidden">
            <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3">
              <i class="pi pi-shopping-cart text-primary-600"></i>
              <h2 class="font-bold text-surface-900 dark:text-white">Order Items ({{ o.products.length }})</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px]">
                <thead class="bg-surface-50 dark:bg-surface-800/70">
                  <tr>
                    <th class="w-14 px-4 py-3 text-left text-xs font-semibold text-surface-500">#</th>
                    <th class="px-3 py-3 text-left text-xs font-semibold text-surface-500 uppercase">Product</th>
                    <th class="px-4 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Price</th>
                    <th class="px-4 py-3 text-center text-xs font-semibold text-surface-500 uppercase">Qty</th>
                    <th class="px-5 py-3 text-right text-xs font-semibold text-surface-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
                  @for (item of o.products; track item.productId; let index = $index) {
                    <tr class="hover:bg-surface-50/80 dark:hover:bg-surface-800/30 transition-colors">
                      <td class="px-4 py-3 text-sm text-surface-400">{{ index + 1 }}</td>
                      <td class="px-3 py-3">
                        <div class="flex items-center gap-3">
                          <div class="w-12 h-12 shrink-0 rounded-lg bg-surface-100 dark:bg-surface-800 overflow-hidden flex items-center justify-center border border-surface-200 dark:border-surface-700">
                            @if (item.image) { <img [src]="item.image" [alt]="item.name" class="w-full h-full object-cover"> } @else { <i class="pi pi-box text-surface-400"></i> }
                          </div>
                          <div class="min-w-0"><p class="text-sm font-semibold leading-5 text-surface-900 dark:text-white">{{ item.name }}</p>@if (item.sku) { <p class="mt-1 text-xs text-surface-400">SKU: {{ item.sku }}</p> }</div>
                        </div>
                      </td>
                      <td class="px-4 py-3 text-sm text-right text-surface-600 dark:text-surface-300">{{ utils.formatCurrency(item.price) }}</td>
                      <td class="px-4 py-3 text-sm text-center font-semibold text-surface-900 dark:text-white">{{ item.quantity }}</td>
                      <td class="px-5 py-3 text-sm text-right font-bold text-surface-900 dark:text-white">{{ utils.formatCurrency(item.subtotal) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <aside class="space-y-4">
            <section class="glass-card-solid overflow-hidden">
              <div class="px-4 py-3.5 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3"><i class="pi pi-calculator text-primary-600"></i><h3 class="font-bold text-surface-900 dark:text-white">Order Summary</h3></div>
              <div class="p-4 space-y-2.5 text-sm">
                <div class="flex justify-between"><span class="text-surface-500">Items</span><span class="font-medium">{{ o.products.length }}</span></div>
                <div class="flex justify-between"><span class="text-surface-500">Subtotal</span><span class="font-medium">{{ utils.formatCurrency(o.subtotal) }}</span></div>
                @if (o.discountTotal) { <div class="flex justify-between text-green-600"><span>Discount</span><span>-{{ utils.formatCurrency(o.discountTotal) }}</span></div> }
                @if (o.taxTotal) { <div class="flex justify-between"><span class="text-surface-500">Tax</span><span>{{ utils.formatCurrency(o.taxTotal) }}</span></div> }
                <div class="flex justify-between"><span class="text-surface-500">Shipping</span><span class="font-medium">{{ utils.formatCurrency(o.shippingTotal) }}</span></div>
                <div class="flex justify-between items-center mt-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"><span class="font-semibold">Total Amount</span><span class="text-xl font-bold">{{ utils.formatCurrency(o.total) }}</span></div>
              </div>
            </section>
            <section class="glass-card-solid overflow-hidden">
              <div class="px-4 py-3.5 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3"><i class="pi pi-credit-card text-primary-600"></i><h3 class="font-bold text-surface-900 dark:text-white">Payment Details</h3></div>
              <div class="p-4 flex gap-3"><div class="w-9 h-9 shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center"><i class="pi pi-check"></i></div><div><p class="text-sm font-semibold text-surface-900 dark:text-white">{{ o.paymentMethod || 'N/A' }}</p><p class="text-xs text-surface-400 mt-1">Paid: {{ o.datePaid ? (o.datePaid | date:'dd MMM yyyy, hh:mm a') : 'N/A' }}</p></div></div>
            </section>
            <section class="glass-card-solid overflow-hidden">
              <div class="px-4 py-3.5 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3"><i class="pi pi-file text-primary-600"></i><h3 class="font-bold text-surface-900 dark:text-white">Billing Information</h3></div>
                <button type="button" (click)="copyAddress(o.billing, o.customer.mobile, 'Billing')" class="w-8 h-8 shrink-0 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center justify-center active:scale-[0.96]" title="Copy billing address" aria-label="Copy billing address"><i class="pi pi-copy text-sm"></i></button>
              </div>
              <div class="p-4 text-sm text-surface-600 dark:text-surface-300 space-y-1"><p class="font-semibold text-surface-900 dark:text-white">{{ o.billing.company || formatRecipient(o.billing) }}</p>@if (o.billing.company) { <p>{{ formatRecipient(o.billing) }}</p> }<p class="leading-5">{{ formatAddress(o.billing) }}</p><p>{{ o.billing.mobile || o.customer.mobile }}</p></div>
            </section>
            <section class="glass-card-solid overflow-hidden">
              <div class="px-4 py-3.5 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3"><i class="pi pi-truck text-primary-600"></i><h3 class="font-bold text-surface-900 dark:text-white">Shipping Information</h3></div>
                <button type="button" (click)="copyAddress(shipTo, o.billing.mobile || o.customer.mobile, 'Shipping')" class="w-8 h-8 shrink-0 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex items-center justify-center active:scale-[0.96]" title="Copy shipping address" aria-label="Copy shipping address"><i class="pi pi-copy text-sm"></i></button>
              </div>
              <div class="p-4 text-sm text-surface-600 dark:text-surface-300 space-y-1"><p class="font-semibold text-surface-900 dark:text-white">{{ shipTo.company || formatRecipient(shipTo) }}</p>@if (shipTo.company) { <p>{{ formatRecipient(shipTo) }}</p> }<p class="leading-5">{{ formatAddress(shipTo) }}</p><p>{{ shipTo.mobile || o.billing.mobile || o.customer.mobile }}</p></div>
            </section>
            <section class="glass-card-solid overflow-hidden">
              <div class="px-4 py-3.5 border-b border-surface-200 dark:border-surface-700 flex items-center gap-3"><i class="pi pi-cog text-primary-600"></i><h3 class="font-bold text-surface-900 dark:text-white">Actions</h3></div>
              <div class="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2"><button (click)="downloadPdf()" class="btn-ghost justify-center whitespace-nowrap"><i class="pi pi-download"></i> Download Invoice</button><button (click)="sendWhatsAppWithPdf(o)" [disabled]="!o.customer.mobile || sendingPdf()" class="btn-ghost justify-center whitespace-nowrap text-green-600 disabled:opacity-40"><i class="pi pi-whatsapp"></i> Share on WhatsApp</button></div>
            </section>
            @if (o.note) { <section class="glass-card-solid p-4"><h3 class="font-bold text-surface-900 dark:text-white mb-2">Customer Note</h3><p class="text-sm leading-5 text-surface-600 dark:text-surface-300">{{ o.note }}</p></section> }
          </aside>
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
  private pdfService = inject(PdfService);
  utils = inject(UtilsService);

  loading = signal(true);
  savingStatus = signal(false);
  sendingPdf = signal(false);
  order = signal<OrderDetail | null>(null);
  selectedStatus = '';

  customerRouteMobile(mobile: string): string {
    return mobile.replace(/[^0-9]/g, '');
  }

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

    // Build order info column
    const orderInfo: { label: string; value: string; color?: [number, number, number] }[] = [
      { label: 'Status', value: this.utils.getStatusLabel(order.status), color: successColor },
    ];
    if (order.paymentMethod) {
      orderInfo.push({ label: 'Payment', value: order.paymentMethod });
    }
    if (order.datePaid) {
      orderInfo.push({ label: 'Paid', value: formatDate(order.datePaid) });
    }

    // Build summary lines
    const summaryLines: { label: string; value: string; color?: [number, number, number] }[] = [];
    if (order.subtotal !== order.total) {
      summaryLines.push({ label: 'Subtotal:', value: formatPrice(order.subtotal) });
    }
    if (order.discountTotal > 0) {
      summaryLines.push({ label: 'Discount:', value: `-${formatPrice(order.discountTotal)}`, color: successColor });
    }
    if (order.taxTotal > 0) {
      summaryLines.push({ label: 'Tax:', value: formatPrice(order.taxTotal) });
    }
    if (order.shippingTotal > 0) {
      summaryLines.push({ label: 'Shipping:', value: formatPrice(order.shippingTotal) });
    }

    this.pdfService.generate({
      title: 'ORDER INVOICE',
      orderNumber: order.orderNumber,
      dateCreated: order.dateCreated,
      total: order.total,
      customer: order.customer,
      products: order.products,
      orderInfo,
      summaryLines,
      addresses: buildPdfAddresses(order),
      note: order.note,
      filename: `Order-Invoice-${order.orderNumber}.pdf`,
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



  async sendWhatsAppWithPdf(order: OrderDetail): Promise<void> {
    if (this.sendingPdf()) return;
    this.sendingPdf.set(true);

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
      { label: 'Status', value: this.utils.getStatusLabel(order.status), color: successColor },
    ];
    if (order.paymentMethod) {
      orderInfo.push({ label: 'Payment', value: order.paymentMethod });
    }
    if (order.datePaid) {
      orderInfo.push({ label: 'Paid', value: formatDate(order.datePaid) });
    }

    const summaryLines: { label: string; value: string; color?: [number, number, number] }[] = [];
    if (order.subtotal !== order.total) {
      summaryLines.push({ label: 'Subtotal:', value: formatPrice(order.subtotal) });
    }
    if (order.discountTotal > 0) {
      summaryLines.push({ label: 'Discount:', value: `-${formatPrice(order.discountTotal)}`, color: successColor });
    }
    if (order.taxTotal > 0) {
      summaryLines.push({ label: 'Tax:', value: formatPrice(order.taxTotal) });
    }
    if (order.shippingTotal > 0) {
      summaryLines.push({ label: 'Shipping:', value: formatPrice(order.shippingTotal) });
    }

    const config: PdfConfig = {
      title: 'ORDER INVOICE',
      orderNumber: order.orderNumber,
      dateCreated: order.dateCreated,
      total: order.total,
      customer: order.customer,
      products: order.products,
      orderInfo,
      summaryLines,
      addresses: buildPdfAddresses(order),
      note: order.note,
      filename: `Order-Invoice-${order.orderNumber}.pdf`,
    };

    const blob = this.pdfService.generateBlob(config);
    const filename = `Order-Invoice-${order.orderNumber}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    // Try native share with file (mobile → WhatsApp receives PDF as attachment)
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: `Hello ${order.customer.name}, here is your Sellwin order #${order.orderNumber} invoice.`,
        });
        this.sendingPdf.set(false);
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          this.sendingPdf.set(false);
          return;
        }
      }
    }

    // Fallback: upload PDF and send link
    this.api.uploadPdf(blob, filename).subscribe({
      next: (res) => {
        this.sendingPdf.set(false);
        const msg = `Hello ${order.customer.name}, your Sellwin order #${order.orderNumber} invoice is ready: ${res.url}`;
        this.utils.openWhatsApp(order.customer.mobile, msg);
      },
      error: () => {
        this.sendingPdf.set(false);
        const msg = `Hello ${order.customer.name}, sharing details for your Sellwin order #${order.orderNumber}. Total: ${this.utils.formatCurrency(order.total)}.`;
        this.utils.openWhatsApp(order.customer.mobile, msg);
        this.toast.add({ severity: 'warn', summary: 'PDF upload failed', detail: 'Sent text message instead', life: 5000 });
      },
    });
  }

  getShippingAddress(order: OrderDetail): Address {
    const shipping = order.shipping;
    const hasShippingAddress = Boolean(
      shipping.address1 || shipping.address2 || shipping.city || shipping.state || shipping.postcode || shipping.country,
    );
    return hasShippingAddress ? shipping : order.billing;
  }

  formatRecipient(address: Address): string {
    return [address.firstName, address.lastName].filter(Boolean).join(' ') || address.company || 'Guest';
  }

  formatAddress(address: Address): string {
    const locality = [address.address1, address.address2, address.city].filter(Boolean).join(', ');
    const stateAndPostcode = [this.getStateName(address.state), address.postcode].filter(Boolean).join(' - ');
    return [locality, stateAndPostcode, this.getCountryName(address.country)].filter(Boolean).join(', ');
  }

  async copyAddress(address: Address, fallbackMobile: string, label: string): Promise<void> {
    const recipient = formatAddressLines(address, fallbackMobile, this.formatRecipient(address), this.formatAddress(address));

    try {
      await navigator.clipboard.writeText(recipient);
      this.toast.add({ severity: 'success', summary: 'Copied', detail: `${label} address copied`, life: 2500 });
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = recipient;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      this.toast.add({
        severity: copied ? 'success' : 'error',
        summary: copied ? 'Copied' : 'Copy failed',
        detail: copied ? `${label} address copied` : 'Please copy the address manually',
        life: 3000,
      });
    }
  }

  private getCountryName(country: string): string {
    if (!country) return '';
    const countries: Record<string, string> = { IN: 'India' };
    return countries[country.toUpperCase()] || country;
  }

  private getStateName(state: string): string {
    if (!state) return '';
    const indianStates: Record<string, string> = {
      AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar', CG: 'Chhattisgarh',
      GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir',
      JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', MP: 'Madhya Pradesh', MH: 'Maharashtra',
      MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', OR: 'Odisha',
      PB: 'Punjab', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu', TS: 'Telangana', TR: 'Tripura',
      UK: 'Uttarakhand', UP: 'Uttar Pradesh', WB: 'West Bengal', AN: 'Andaman and Nicobar Islands',
      CH: 'Chandigarh', DH: 'Dadra and Nagar Haveli and Daman and Diu', DL: 'Delhi', LA: 'Ladakh',
      LD: 'Lakshadweep', PY: 'Puducherry',
    };
    return indianStates[state.toUpperCase()] || state;
  }
}

function formatAddressLines(address: Address, fallbackMobile: string, recipient: string, formattedAddress: string): string {
  return [
    address.company,
    recipient !== address.company ? recipient : '',
    formattedAddress,
    address.mobile || fallbackMobile,
  ].filter(Boolean).join('\n');
}
