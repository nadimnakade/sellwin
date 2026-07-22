import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { PdfService, PdfConfig } from '../../core/services/pdf.service';
import { ActiveCart } from '../../core/interfaces';

@Component({
  selector: 'app-active-carts',
  standalone: true,
  imports: [NgClass, ToastModule],
  providers: [MessageService],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Active Carts</h1>
          <p class="text-surface-500 mt-1">Customers actively shopping in the last 1 minute</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="btn-ghost" [disabled]="!carts().length">
            <i class="pi pi-download"></i> Export CSV
          </button>
          <button (click)="refresh()" class="btn-ghost" [ngClass]="{'animate-spin': loading()}">
            <i class="pi pi-refresh"></i>
          </button>
        </div>
      </div>

      <div class="glass-card overflow-hidden">
        @if (loading()) {
          <div class="p-6 space-y-4">
            @for (_ of [1,2,3]; track _) {
              <div class="flex gap-4"><div class="skeleton-pulse h-5 w-32"></div><div class="skeleton-pulse h-5 w-28"></div><div class="skeleton-pulse h-5 w-16"></div><div class="skeleton-pulse h-5 w-20"></div><div class="skeleton-pulse h-5 w-24 ml-auto"></div></div>
            }
          </div>
        } @else if (!carts().length) {
          <div class="text-center py-16 text-surface-400">
            <i class="pi pi-check-circle text-4xl mb-4 block"></i>
            <p class="text-lg font-medium">No active carts</p>
            <p class="text-sm mt-1">All customers with carts are idle or have checked out</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-surface-200 dark:border-surface-700">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Customer</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Mobile</th>
                  <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Products</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Cart Value</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Last Activity</th>
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (cart of carts(); track cart.id) {
                  <tr class="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition">
                    <td class="px-4 py-3 text-sm font-medium text-surface-900 dark:text-white">{{ cart.name || 'Guest' }}</td>
                    <td class="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{{ cart.mobile }}</td>
                    <td class="px-4 py-3 text-sm text-center text-surface-700 dark:text-surface-300">{{ cart.products }}</td>
                    <td class="px-4 py-3 text-sm text-right font-semibold text-surface-900 dark:text-white">{{ utils.formatCurrency(cart.cartValue) }}</td>
                    <td class="px-4 py-3 text-sm text-right text-surface-500">{{ cart.lastActivityAgo }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="sendWhatsAppWithPdf(cart)"
                                [disabled]="!cart.mobile || sendingPdfId() === cart.id"
                                class="btn-ghost p-1.5 text-green-600 hover:text-green-700"
                                [title]="cart.mobile ? 'WhatsApp' : 'Phone number missing'">
                          @if (sendingPdfId() === cart.id) {
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

          <div class="px-4 py-3 border-t border-surface-200 dark:border-surface-700 text-sm text-surface-400">
            Showing {{ carts().length }} active cart(s)
          </div>
        }
      </div>
    </div>
  `,
})
export class ActiveCartsComponent implements OnInit {
  private api = inject(ApiService);
  private pdfService = inject(PdfService);
  private toast = inject(MessageService);
  utils = inject(UtilsService);

  loading = signal(true);
  sendingPdfId = signal<number | null>(null);
  carts = signal<ActiveCart[]>([]);

  ngOnInit(): void {
    this.loadCarts();
  }

  loadCarts(): void {
    this.loading.set(true);
    this.api.getActiveCarts().subscribe({
      next: (res) => { this.carts.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  refresh(): void {
    this.loadCarts();
  }

  exportCsv(): void {
    const data = this.carts().map((c) => ({
      Customer: c.name || 'Guest',
      Mobile: c.mobile,
      Products: c.products,
      'Cart Value': c.cartValue,
      'Last Activity': c.lastActivity,
    }));
    this.utils.exportToCsv(data, `active-carts-${new Date().toISOString().slice(0, 10)}`);
  }

  async sendWhatsAppWithPdf(cart: ActiveCart): Promise<void> {
    if (!cart.mobile || this.sendingPdfId() === cart.id) return;
    this.sendingPdfId.set(cart.id);

    const products = (cart.cartData || []).map((p: any) => ({
      productId: p.product_id || 0,
      name: p.product_name || 'Product',
      sku: '',
      quantity: p.quantity || 0,
      price: p.price || 0,
      subtotal: p.subtotal || (p.price || 0) * (p.quantity || 0),
      image: '',
      imageBase64: null as string | null,
    }));

    const config: PdfConfig = {
      title: 'CART INVOICE',
      orderNumber: `A${cart.id}`,
      dateCreated: cart.lastActivity,
      total: cart.cartValue,
      customer: { name: cart.name || 'Guest', mobile: cart.mobile, email: '' },
      products,
      filename: `Cart-Invoice-A${cart.id}.pdf`,
    };

    const blob = this.pdfService.generateBlob(config);
    const filename = `Cart-Invoice-A${cart.id}.pdf`;
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: `Hi ${cart.name || 'there'}, here is your Sellwin cart invoice.`,
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
        const msg = `Hi ${cart.name || 'there'}, your Sellwin cart invoice is ready: ${res.url}`;
        this.utils.openWhatsApp(cart.mobile, msg);
      },
      error: () => {
        this.sendingPdfId.set(null);
        this.utils.openWhatsApp(cart.mobile);
        this.toast.add({ severity: 'warn', summary: 'PDF upload failed', detail: 'Sent text message instead', life: 5000 });
      },
    });
  }
}
