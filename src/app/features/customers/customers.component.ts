import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { CustomerHistory } from '../../core/interfaces';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Customers</h1>
          <p class="text-surface-500 mt-1">Search and view customer details by mobile number</p>
        </div>
      </div>
      <div class="glass-card p-6 mb-6">
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">Search by Mobile Number</label>
        <div class="flex gap-3">
          <div class="relative flex-1 max-w-md">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"></i>
            <input type="tel" #mobileInput
                   (keyup.enter)="search(mobileInput.value)"
                   placeholder="Enter 10-digit mobile number"
                   class="input-field pl-9"
                   maxlength="15">
          </div>
          <button (click)="search(mobileInput.value)" class="btn-primary">
            <i class="pi pi-search"></i> Search
          </button>
        </div>
        @if (error()) {
          <p class="text-sm text-red-500 mt-2">{{ error() }}</p>
        }
      </div>

      @if (loading()) {
        <div class="glass-card p-6 space-y-4">
          @for (_ of [1,2,3,4,5]; track _) {
            <div class="skeleton-pulse h-5 w-full"></div>
          }
        </div>
      } @else {
        @if (customer(); as c) {
          <div class="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
            <div class="stat-card">
              <span class="text-sm text-surface-500">Customer</span>
              <p class="text-xl font-bold text-surface-900 dark:text-white mt-1">{{ c.name || 'Unknown' }}</p>
              <p class="text-sm text-surface-400">{{ c.mobile }}</p>
            </div>
            <div class="stat-card">
              <span class="text-sm text-surface-500">Lifetime Value</span>
              <p class="text-xl font-bold text-surface-900 dark:text-white mt-1">{{ utils.formatCurrency(c.lifetimeValue) }}</p>
            </div>
            <div class="stat-card">
              <span class="text-sm text-surface-500">Total Orders</span>
              <p class="text-xl font-bold text-surface-900 dark:text-white mt-1">{{ c.orders.length }}</p>
            </div>
            <div class="stat-card">
              <span class="text-sm text-surface-500">Products Viewed</span>
              <p class="text-xl font-bold text-surface-900 dark:text-white mt-1">{{ c.productsViewed }}</p>
            </div>
          </div>

          <div class="glass-card mb-6 overflow-hidden">
            <div class="p-4 border-b border-surface-200 dark:border-surface-700">
              <h3 class="text-sm font-semibold text-surface-500 uppercase">Order History</h3>
            </div>
            @if (c.orders.length) {
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-surface-200 dark:border-surface-700">
                      <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Order ID</th>
                      <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Amount</th>
                      <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                      <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (order of c.orders; track order.id) {
                      <tr class="border-b border-surface-100 dark:border-surface-800">
                        <td class="px-4 py-3 text-sm font-medium text-surface-900 dark:text-white">#{{ order.id }}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-surface-900 dark:text-white">{{ utils.formatCurrency(order.total) }}</td>
                        <td class="px-4 py-3"><span [class]="utils.getStatusClass(order.status)">{{ utils.getStatusLabel(order.status) }}</span></td>
                        <td class="px-4 py-3 text-sm text-right text-surface-500">{{ order.date | date:'dd MMM yyyy' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="p-6 text-center text-surface-400">No orders found</div>
            }
          </div>

          <div class="glass-card overflow-hidden">
            <div class="p-4 border-b border-surface-200 dark:border-surface-700">
              <h3 class="text-sm font-semibold text-surface-500 uppercase">Cart History</h3>
            </div>
            @if (c.carts.length) {
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead>
                    <tr class="border-b border-surface-200 dark:border-surface-700">
                      <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                      <th class="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Products</th>
                      <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Cart Value</th>
                      <th class="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cart of c.carts; track cart.id) {
                      <tr class="border-b border-surface-100 dark:border-surface-800">
                        <td class="px-4 py-3"><span [class]="utils.getStatusClass(cart.status)">{{ utils.getStatusLabel(cart.status) }}</span></td>
                        <td class="px-4 py-3 text-sm text-center text-surface-700 dark:text-surface-300">{{ cart.product_count }}</td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-surface-900 dark:text-white">{{ utils.formatCurrency(cart.cart_value) }}</td>
                        <td class="px-4 py-3 text-sm text-right text-surface-500">{{ cart.last_activity | date:'dd MMM, hh:mm a' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="p-6 text-center text-surface-400">No cart history found</div>
            }
          </div>
        } @else if (searched()) {
          <div class="text-center py-16 text-surface-400">
            <i class="pi pi-user text-4xl mb-4 block"></i>
            <p class="text-lg font-medium">Customer not found</p>
            <p class="text-sm mt-1">Try searching with a different mobile number</p>
          </div>
        }
      }
    </div>
  `,
})
export class CustomersComponent {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  loading = signal(false);
  customer = signal<CustomerHistory | null>(null);
  error = signal('');
  searched = signal(false);

  search(mobile: string): void {
    const clean = mobile.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      this.error.set('Please enter a valid mobile number (min 10 digits)');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.searched.set(true);
    this.customer.set(null);

    this.api.getCustomer(clean).subscribe({
      next: (res) => { this.customer.set(res); this.loading.set(false); },
      error: (err) => {
        this.customer.set(null);
        this.loading.set(false);
        if (err.status !== 404) this.error.set('Error loading customer data');
      },
    });
  }
}
