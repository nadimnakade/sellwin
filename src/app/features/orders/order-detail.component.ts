import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { OrderDetail } from '../../core/interfaces';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="flex items-center gap-4">
          <a routerLink="/orders" class="btn-ghost p-2">
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
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-6">
          <div class="glass-card p-6">
            @for (_ of [1,2,3,4]; track _) {
              <div class="skeleton-pulse h-5 w-3/4 mb-4"></div>
            }
          </div>
        </div>
      } @else {
        @if (order(); as o) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="glass-card p-6">
              <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">Customer</h3>
              <div class="space-y-3">
                <div>
                  <p class="text-sm text-surface-400">Name</p>
                  <p class="text-sm font-medium text-surface-900 dark:text-white">{{ o.customer.name }}</p>
                </div>
                <div>
                  <p class="text-sm text-surface-400">Mobile</p>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-surface-900 dark:text-white">{{ o.customer.mobile }}</p>
                    <button (click)="utils.openWhatsApp(o.customer.mobile)" class="text-green-600 hover:text-green-700">
                      <i class="pi pi-whatsapp"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <p class="text-sm text-surface-400">Email</p>
                  <p class="text-sm font-medium text-surface-900 dark:text-white">{{ o.customer.email || 'N/A' }}</p>
                </div>
              </div>
            </div>
            <div class="glass-card p-6">
              <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">Billing Address</h3>
              <div class="space-y-2 text-sm text-surface-700 dark:text-surface-300">
                <p>{{ o.billing.address1 }}{{ o.billing.address2 ? ', ' + o.billing.address2 : '' }}</p>
                <p>{{ o.billing.city }}, {{ o.billing.state }} - {{ o.billing.postcode }}</p>
                <p>{{ o.billing.country }}</p>
              </div>
            </div>
            <div class="glass-card p-6">
              <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider mb-4">Shipping Address</h3>
              @if (o.shipping.address1) {
                <div class="space-y-2 text-sm text-surface-700 dark:text-surface-300">
                  <p>{{ o.shipping.address1 }}{{ o.shipping.address2 ? ', ' + o.shipping.address2 : '' }}</p>
                  <p>{{ o.shipping.city }}, {{ o.shipping.state }} - {{ o.shipping.postcode }}</p>
                  <p>{{ o.shipping.country }}</p>
                </div>
              } @else {
                <p class="text-sm text-surface-400">Same as billing</p>
              }
            </div>
          </div>
          <div class="glass-card mt-6 overflow-hidden">
            <div class="p-6 pb-0">
              <h3 class="text-sm font-semibold text-surface-500 uppercase tracking-wider">Products</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-surface-200 dark:border-surface-700">
                    <th class="text-left px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Product</th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Qty</th>
                    <th class="text-right px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Price</th>
                    <th class="text-right px-6 py-3 text-xs font-semibold text-surface-500 uppercase">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of o.products; track item.productId) {
                    <tr class="border-b border-surface-100 dark:border-surface-800">
                      <td class="px-6 py-3 text-sm font-medium text-surface-900 dark:text-white">{{ item.name }}</td>
                      <td class="px-4 py-3 text-sm text-center text-surface-600 dark:text-surface-400">{{ item.quantity }}</td>
                      <td class="px-6 py-3 text-sm text-right text-surface-700 dark:text-surface-300">{{ utils.formatCurrency(item.price) }}</td>
                      <td class="px-6 py-3 text-sm text-right font-medium text-surface-900 dark:text-white">{{ utils.formatCurrency(item.subtotal) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="p-6 border-t border-surface-200 dark:border-surface-700 space-y-2">
              <div class="flex justify-between text-sm"><span class="text-surface-500">Subtotal</span><span>{{ utils.formatCurrency(o.subtotal) }}</span></div>
              @if (o.discountTotal) {
                <div class="flex justify-between text-sm"><span class="text-surface-500">Discount</span><span class="text-green-600">-{{ utils.formatCurrency(o.discountTotal) }}</span></div>
              }
              @if (o.taxTotal) {
                <div class="flex justify-between text-sm"><span class="text-surface-500">Tax</span><span>{{ utils.formatCurrency(o.taxTotal) }}</span></div>
              }
              @if (o.shippingTotal) {
                <div class="flex justify-between text-sm"><span class="text-surface-500">Shipping</span><span>{{ utils.formatCurrency(o.shippingTotal) }}</span></div>
              }
              <div class="flex justify-between font-bold text-lg pt-2 border-t border-surface-200 dark:border-surface-700">
                <span>Total</span>
                <span>{{ utils.formatCurrency(o.total) }}</span>
              </div>
            </div>
          </div>
          <div class="glass-card mt-6 p-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p class="text-sm text-surface-400">Payment Method</p>
                <p class="text-sm font-medium text-surface-900 dark:text-white mt-1">{{ o.paymentMethod || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-sm text-surface-400">Order Date</p>
                <p class="text-sm font-medium text-surface-900 dark:text-white mt-1">{{ o.dateCreated | date:'dd MMM yyyy, hh:mm a' }}</p>
              </div>
              <div>
                <p class="text-sm text-surface-400">Paid Date</p>
                <p class="text-sm font-medium text-surface-900 dark:text-white mt-1">{{ o.datePaid ? (o.datePaid | date:'dd MMM yyyy, hh:mm a') : 'N/A' }}</p>
              </div>
            </div>
            @if (o.note) {
              <div class="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                <p class="text-sm text-surface-400 mb-1">Customer Note</p>
                <p class="text-sm text-surface-700 dark:text-surface-300">{{ o.note }}</p>
              </div>
            }
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
  order = signal<OrderDetail | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.api.getOrder(id).subscribe({
        next: (res) => { this.order.set(res); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
  }
}
