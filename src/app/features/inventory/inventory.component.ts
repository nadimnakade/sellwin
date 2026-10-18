import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { InventoryProduct } from '../../core/interfaces';
import { UtilsService } from '../../core/services/utils.service';

type StockFilter = 'all' | 'low' | 'out' | 'backorder';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-container">
      <div class="page-header gap-4">
        <div><h1 class="page-title">Inventory Alerts</h1><p class="text-surface-500 mt-1">Find products that need attention before sales are lost</p></div>
        <button type="button" (click)="loadProducts()" class="btn-ghost" [disabled]="loading()"><i class="pi pi-refresh" [class.animate-spin]="loading()"></i> Refresh</button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button type="button" (click)="filter.set('all')" class="stat-card text-left"><span class="text-xs text-surface-500">Loaded Products</span><p class="text-2xl font-bold mt-1">{{ products().length }}</p><p class="text-xs text-surface-400 mt-1">{{ totalProducts() }} in WooCommerce</p></button>
        <button type="button" (click)="filter.set('low')" class="stat-card text-left"><span class="text-xs text-amber-600">Low Stock</span><p class="text-2xl font-bold mt-1 text-amber-600">{{ lowStockCount() }}</p><p class="text-xs text-surface-400 mt-1">At or below {{ threshold() }} units</p></button>
        <button type="button" (click)="filter.set('out')" class="stat-card text-left"><span class="text-xs text-red-600">Out of Stock</span><p class="text-2xl font-bold mt-1 text-red-600">{{ outOfStockCount() }}</p><p class="text-xs text-surface-400 mt-1">Unavailable products</p></button>
        <button type="button" (click)="filter.set('backorder')" class="stat-card text-left"><span class="text-xs text-blue-600">Backorders</span><p class="text-2xl font-bold mt-1 text-blue-600">{{ backorderCount() }}</p><p class="text-xs text-surface-400 mt-1">Products accepting backorders</p></button>
      </div>

      <div class="glass-card p-4 mb-5 flex flex-col lg:flex-row gap-3 lg:items-end">
        <div class="flex-1"><label class="block text-xs font-semibold text-surface-500 mb-1.5" for="inventory-search">Search products</label><div class="relative"><i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"></i><input id="inventory-search" [(ngModel)]="searchTerm" (keyup.enter)="loadProducts()" class="input-field pl-9" placeholder="Product name"></div></div>
        <div class="w-full lg:w-44"><label class="block text-xs font-semibold text-surface-500 mb-1.5" for="stock-filter">Stock status</label><select id="stock-filter" [ngModel]="filter()" (ngModelChange)="filter.set($event)" class="input-field"><option value="all">All products</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="backorder">Backorder</option></select></div>
        <div class="w-full lg:w-36"><label class="block text-xs font-semibold text-surface-500 mb-1.5" for="stock-threshold">Low-stock level</label><input id="stock-threshold" type="number" min="1" max="100" [ngModel]="threshold()" (ngModelChange)="setThreshold($event)" class="input-field"></div>
        <button type="button" (click)="loadProducts()" class="btn-primary justify-center"><i class="pi pi-search"></i> Apply</button>
      </div>

      @if (loading()) {
        <div class="glass-card p-6 space-y-4">@for (_ of [1,2,3,4,5]; track _) { <div class="skeleton-pulse h-14"></div> }</div>
      } @else if (error()) {
        <div class="glass-card p-10 text-center"><i class="pi pi-exclamation-triangle text-3xl text-red-500"></i><p class="font-semibold mt-3">Could not load inventory</p><p class="text-sm text-surface-500 mt-1">{{ error() }}</p></div>
      } @else {
        <div class="glass-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px]">
              <thead class="bg-surface-50 dark:bg-surface-800/70"><tr><th class="px-4 py-3 text-left text-xs font-semibold text-surface-500">PRODUCT</th><th class="px-4 py-3 text-left text-xs font-semibold text-surface-500">SKU</th><th class="px-4 py-3 text-right text-xs font-semibold text-surface-500">PRICE</th><th class="px-4 py-3 text-center text-xs font-semibold text-surface-500">STOCK</th><th class="px-4 py-3 text-center text-xs font-semibold text-surface-500">STATUS</th><th class="px-4 py-3 text-right text-xs font-semibold text-surface-500">SUGGESTED REORDER</th></tr></thead>
              <tbody class="divide-y divide-surface-100 dark:divide-surface-800">
                @for (product of filteredProducts(); track product.id) {
                  <tr class="hover:bg-surface-50/70 dark:hover:bg-surface-800/30">
                    <td class="px-4 py-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-100 overflow-hidden flex items-center justify-center">@if (product.image) { <img [src]="product.image" [alt]="product.name" class="w-full h-full object-cover"> } @else { <i class="pi pi-box text-surface-400"></i> }</div><div><p class="text-sm font-semibold text-surface-900 dark:text-white">{{ product.name }}</p><p class="text-xs text-surface-400">{{ product.totalSales }} sold</p></div></div></td>
                    <td class="px-4 py-3 text-sm text-surface-500">{{ product.sku || '—' }}</td>
                    <td class="px-4 py-3 text-sm text-right font-medium">{{ utils.formatCurrency(product.price) }}</td>
                    <td class="px-4 py-3 text-center font-bold" [class.text-red-600]="product.stockStatus === 'outofstock'" [class.text-amber-600]="isLowStock(product)">{{ product.stockQuantity === null ? 'Not tracked' : product.stockQuantity }}</td>
                    <td class="px-4 py-3 text-center"><span [class]="stockClass(product)">{{ stockLabel(product) }}</span></td>
                    <td class="px-4 py-3 text-sm text-right font-semibold">{{ suggestedReorder(product) || '—' }}</td>
                  </tr>
                } @empty { <tr><td colspan="6" class="px-6 py-14 text-center text-surface-400"><i class="pi pi-check-circle text-3xl block mb-3"></i>No products match this stock filter</td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class InventoryComponent implements OnInit {
  private api = inject(ApiService);
  utils = inject(UtilsService);

  products = signal<InventoryProduct[]>([]);
  totalProducts = signal(0);
  loading = signal(true);
  error = signal('');
  filter = signal<StockFilter>('all');
  threshold = signal(5);
  searchTerm = '';

  lowStockCount = computed(() => this.products().filter((product) => this.isLowStock(product)).length);
  outOfStockCount = computed(() => this.products().filter((product) => product.stockStatus === 'outofstock').length);
  backorderCount = computed(() => this.products().filter((product) => product.stockStatus === 'onbackorder').length);
  filteredProducts = computed(() => this.products().filter((product) => {
    if (this.filter() === 'low') return this.isLowStock(product);
    if (this.filter() === 'out') return product.stockStatus === 'outofstock';
    if (this.filter() === 'backorder') return product.stockStatus === 'onbackorder';
    return true;
  }));

  ngOnInit(): void { this.loadProducts(); }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getInventoryProducts(this.searchTerm).subscribe({
      next: (response) => { this.products.set(response.products); this.totalProducts.set(response.total); this.loading.set(false); },
      error: (error) => { this.error.set(error?.error?.message || 'Check the WooCommerce API connection.'); this.loading.set(false); },
    });
  }

  setThreshold(value: number): void { this.threshold.set(Math.max(1, Number(value) || 1)); }
  isLowStock(product: InventoryProduct): boolean { return product.manageStock && product.stockStatus === 'instock' && product.stockQuantity !== null && product.stockQuantity > 0 && product.stockQuantity <= this.threshold(); }
  suggestedReorder(product: InventoryProduct): number { return product.manageStock && product.stockQuantity !== null ? Math.max(0, this.threshold() * 2 - product.stockQuantity) : 0; }
  stockLabel(product: InventoryProduct): string { return product.stockStatus === 'outofstock' ? 'Out of stock' : product.stockStatus === 'onbackorder' ? 'Backorder' : this.isLowStock(product) ? 'Low stock' : 'In stock'; }
  stockClass(product: InventoryProduct): string {
    if (product.stockStatus === 'outofstock') return 'status-badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (product.stockStatus === 'onbackorder') return 'status-badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (this.isLowStock(product)) return 'status-badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    return 'status-badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  }
}
