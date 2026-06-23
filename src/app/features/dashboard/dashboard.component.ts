import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { UtilsService } from '../../core/services/utils.service';
import { DashboardStats, RevenueTrend, OrdersTrend, AbandonedTrend, TopProduct, Order } from '../../core/interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="text-surface-500 mt-1">Real-time overview of your store</p>
        </div>
        <button (click)="refresh()" class="btn-ghost">
          <i class="pi pi-refresh" [ngClass]="{'animate-spin': loading()}"></i>
          Refresh
        </button>
      </div>

      <!-- Stats Grid -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          @for (_ of [1,2,3,4]; track _) {
            <div class="stat-card">
              <div class="skeleton-pulse h-3 w-24 mb-3"></div>
              <div class="skeleton-pulse h-8 w-32 mb-2"></div>
              <div class="skeleton-pulse h-3 w-20"></div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div class="stat-card">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-surface-500">Revenue Today</span>
              <div class="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <i class="pi pi-dollar text-green-600 dark:text-green-400"></i>
              </div>
            </div>
            <p class="text-3xl font-bold text-surface-900 dark:text-white">{{ utils.formatCurrency(stats().revenueToday) }}</p>
            <p class="text-xs text-surface-400 mt-1">Last 24 hours</p>
          </div>

          <div class="stat-card">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-surface-500">Orders Today</span>
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <i class="pi pi-shopping-bag text-blue-600 dark:text-blue-400"></i>
              </div>
            </div>
            <p class="text-3xl font-bold text-surface-900 dark:text-white">{{ stats().ordersToday }}</p>
            <p class="text-xs text-surface-400 mt-1">Total orders placed</p>
          </div>

          <div class="stat-card">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-surface-500">Active Carts</span>
              <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <i class="pi pi-clock text-amber-600 dark:text-amber-400"></i>
              </div>
            </div>
            <p class="text-3xl font-bold text-surface-900 dark:text-white">{{ stats().activeCarts }}</p>
            <p class="text-xs text-surface-400 mt-1">Shopping right now</p>
          </div>

          <div class="stat-card">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-surface-500">Abandoned Carts</span>
              <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <i class="pi pi-exclamation-circle text-red-600 dark:text-red-400"></i>
              </div>
            </div>
            <p class="text-3xl font-bold text-surface-900 dark:text-white">{{ stats().abandonedCarts }}</p>
            <p class="text-xs text-surface-400 mt-1">Needs attention</p>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Revenue Chart Card -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Revenue Trend</h3>
          @if (revenueTrend().length) {
            <div class="space-y-2">
              @for (item of revenueTrend().slice(-7); track item.date) {
                <div class="flex items-center gap-3">
                  <span class="text-xs text-surface-400 w-10">{{ item.date.slice(5) }}</span>
                  <div class="flex-1 h-6 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                         [style.width.%]="(item.revenue / maxRevenue) * 100">
                    </div>
                  </div>
                  <span class="text-xs font-medium text-surface-600 dark:text-surface-300 w-20 text-right">{{ utils.formatCurrency(item.revenue) }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8 text-surface-400">No revenue data available</div>
          }
        </div>

        <!-- Orders Chart Card -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Orders Trend (30 days)</h3>
          @if (ordersTrend().length) {
            <div class="flex items-end gap-1 h-40">
              @for (item of ordersTrend(); track item.date) {
                <div class="flex-1 flex flex-col items-center gap-1 group relative">
                  <div class="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t transition-all duration-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
                       [style.height.%]="(item.orders / maxOrders) * 100 || 2">
                    <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {{ item.orders }} orders
                    </div>
                  </div>
                  @if ($index % 5 === 0) {
                    <span class="text-[10px] text-surface-400 -rotate-45 origin-left whitespace-nowrap">{{ item.date.slice(5) }}</span>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8 text-surface-400">No order data available</div>
          }
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Top Products -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Top Products</h3>
          @if (topProducts().length) {
            <div class="space-y-3">
              @for (product of topProducts().slice(0, 5); track product.productId) {
                <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition">
                  <div class="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    @if (product.image) {
                      <img [src]="product.image" [alt]="product.name" class="w-full h-full object-cover">
                    } @else {
                      <i class="pi pi-box text-surface-400"></i>
                    }
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{{ product.name }}</p>
                    <p class="text-xs text-surface-400">{{ product.orderCount }} orders</p>
                  </div>
                  <span class="text-sm font-semibold text-surface-700 dark:text-surface-300">{{ utils.formatCurrency(product.price) }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-6 text-surface-400">No product data yet</div>
          }
        </div>

        <!-- Abandoned Cart Trend -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Abandoned Cart Trend</h3>
          @if (abandonedTrend().length) {
            <div class="flex items-end gap-1 h-32">
              @for (item of abandonedTrend(); track item.date) {
                <div class="flex-1 bg-red-100 dark:bg-red-900/30 rounded-t transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-800/40 relative group"
                     [style.height.%]="(item.carts / maxAbandoned) * 100 || 2">
                  <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-800 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {{ item.carts }} carts
                  </div>
                  @if ($index % 2 === 0) {
                    <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-surface-400 whitespace-nowrap">{{ item.date.slice(5) }}</span>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-6 text-surface-400">No data available</div>
          }
        </div>

        <!-- Recent Orders -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Recent Orders</h3>
          @if (recentOrders().length) {
            <div class="space-y-3">
              @for (order of recentOrders(); track order.id) {
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition">
                  <div>
                    <p class="text-sm font-medium text-surface-800 dark:text-surface-200">#{{ order.orderNumber }}</p>
                    <p class="text-xs text-surface-400">{{ order.customerName }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-surface-700 dark:text-surface-300">{{ utils.formatCurrency(order.total) }}</p>
                    <span [class]="utils.getStatusClass(order.status)">{{ utils.getStatusLabel(order.status) }}</span>
                  </div>
                </div>
              }
            </div>
            <a routerLink="/orders" class="block text-center text-sm text-primary-600 dark:text-primary-400 mt-4 hover:underline">
              View all orders
            </a>
          } @else {
            <div class="text-center py-6 text-surface-400">No recent orders</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  loading = signal(true);
  stats = signal<DashboardStats>({ ordersToday: 0, revenueToday: 0, activeCarts: 0, abandonedCarts: 0 });
  revenueTrend = signal<RevenueTrend[]>([]);
  ordersTrend = signal<OrdersTrend[]>([]);
  abandonedTrend = signal<AbandonedTrend[]>([]);
  topProducts = signal<TopProduct[]>([]);
  recentOrders = signal<Order[]>([]);

  get maxRevenue(): number {
    return Math.max(...this.revenueTrend().map((r) => r.revenue), 1);
  }

  get maxOrders(): number {
    return Math.max(...this.ordersTrend().map((o) => o.orders), 1);
  }

  get maxAbandoned(): number {
    return Math.max(...this.abandonedTrend().map((a) => a.carts), 1);
  }

  ngOnInit(): void {
    this.loadData();
  }

  refresh(): void {
    this.loading.set(true);
    this.loadData();
  }

  private loadData(): void {
    this.api.getDashboard().subscribe((d) => { this.stats.set(d); });
    this.api.getRevenueTrend().subscribe((d) => { this.revenueTrend.set(d); });
    this.api.getOrdersTrend().subscribe((d) => { this.ordersTrend.set(d); });
    this.api.getAbandonedTrend().subscribe((d) => { this.abandonedTrend.set(d); });
    this.api.getTopProducts(5).subscribe((d) => { this.topProducts.set(d); });
    this.api.getOrders({ perPage: 5 }).subscribe((d) => {
      this.recentOrders.set(d.orders);
      this.loading.set(false);
    });
  }
}
