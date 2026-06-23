import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { AbandonedCart } from '../../core/interfaces';

@Component({
  selector: 'app-abandoned-carts',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Abandoned Carts</h1>
          <p class="text-surface-500 mt-1">Customers who added products but haven't returned</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="btn-ghost" [disabled]="!carts().length">
            <i class="pi pi-download"></i> Export CSV
          </button>
          <button (click)="refresh()" class="btn-ghost">
            <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
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
            <i class="pi pi-smile text-4xl mb-4 block"></i>
            <p class="text-lg font-medium">No abandoned carts</p>
            <p class="text-sm mt-1">Great! No customers have abandoned their carts</p>
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
                  <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Abandoned Since</th>
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
                    <td class="px-4 py-3 text-sm text-right text-surface-500">{{ cart.abandonedSince }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="utils.openWhatsApp(cart.mobile)"
                                class="btn-ghost p-1.5 text-primary-600" title="Recover">
                          <i class="pi pi-send"></i>
                        </button>
                        <button (click)="utils.openWhatsApp(cart.mobile, 'Hi, you recently added products to your cart on Sellwin. Can we help you complete your order?')"
                                class="btn-ghost p-1.5 text-green-600 hover:text-green-700" title="WhatsApp">
                          <i class="pi pi-whatsapp"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="px-4 py-3 border-t border-surface-200 dark:border-surface-700 text-sm text-surface-400">
            Showing {{ carts().length }} abandoned cart(s)
          </div>
        }
      </div>
    </div>
  `,
})
export class AbandonedCartsComponent implements OnInit {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  loading = signal(true);
  carts = signal<AbandonedCart[]>([]);

  ngOnInit(): void {
    this.loadCarts();
  }

  loadCarts(): void {
    this.loading.set(true);
    this.api.getAbandonedCarts().subscribe({
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
      'Abandoned Since': c.abandonedSince,
    }));
    this.utils.exportToCsv(data, `abandoned-carts-${new Date().toISOString().slice(0, 10)}`);
  }
}
