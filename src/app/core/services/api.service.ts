import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, map, catchError, forkJoin, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardStats, Order, OrderDetail, ActiveCart, AbandonedCart,
  CustomerHistory, RevenueTrend, OrdersTrend, AbandonedTrend,
  TopProduct, PaginatedResponse, InventoryProduct, InventoryResponse,
} from '../interfaces';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private wc = environment.woocommerceUrl;

  private auth(): HttpParams {
    return new HttpParams()
      .set('consumer_key', environment.consumerKey)
      .set('consumer_secret', environment.consumerSecret);
  }

  constructor(private http: HttpClient) {}

  // ─── DASHBOARD ───────────────────────────────────────

  getDashboard(): Observable<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const params = this.auth()
      .set('after', today.toISOString())
      .set('per_page', '100');

    const orders$ = this.http.get<any[]>(`${this.wc}/orders`, { params }).pipe(
      map((orders) => {
        const revenueToday = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
        return { ordersToday: orders.length, revenueToday };
      }),
    );

    const carts$ = this.http.get<any>(`${environment.apiUrl}/carts`, {
      params: this.auth().set('idle_minutes', '1').set('per_page', '1'),
    }).pipe(
      map((res) => ({ latestCarts: res.total || 0 })),
      catchError(() => of({ latestCarts: 0 })),
    );

    const activeCarts$ = this.http.get<any[]>(`${environment.apiUrl}/active-carts`, {
      params: this.auth().set('minutes', '1'),
    }).pipe(
      map((carts) => ({ activeCarts: (carts || []).length })),
      catchError(() => of({ activeCarts: 0 })),
    );

    return forkJoin([orders$, carts$, activeCarts$]).pipe(
      map(([orders, carts, active]) => ({
        ordersToday: orders.ordersToday,
        revenueToday: orders.revenueToday,
        activeCarts: active.activeCarts,
        latestCarts: carts.latestCarts,
      })),
    );
  }

  // ─── ORDERS ───────────────────────────────────────────

  getOrders(paramsReq?: { page?: number; perPage?: number; status?: string; search?: string }): Observable<PaginatedResponse<Order>> {
    let p = this.auth();
    if (paramsReq) {
      if (paramsReq.page) p = p.set('page', String(paramsReq.page));
      if (paramsReq.perPage) p = p.set('per_page', String(paramsReq.perPage));
      if (paramsReq.status) p = p.set('status', paramsReq.status);
      if (paramsReq.search) p = p.set('search', paramsReq.search);
    }

    return this.http.get<any[]>(`${this.wc}/orders`, { params: p, observe: 'response' }).pipe(
      map((res) => {
        const total = parseInt(res.headers.get('X-WP-Total') || '0', 10);
        const orders = (res.body || []).map(mapWCOrder);
        return { orders, total, page: paramsReq?.page || 1, perPage: paramsReq?.perPage || 20 };
      }),
    );
  }

  getOrder(id: number): Observable<OrderDetail> {
    return this.http.get<any>(`${this.wc}/orders/${id}`, { params: this.auth() }).pipe(
      map(mapWCOrderDetail),
    );
  }

  getSellwinOrder(id: number): Observable<OrderDetail> {
    return this.http.get<any>(`${environment.apiUrl}/order/${id}`, { params: this.auth() }).pipe(
      map(mapSellwinOrderDetail),
    );
  }

  getCartDetail(id: number): Observable<OrderDetail> {
    return this.http.get<any>(`${environment.apiUrl}/cart/${id}`, { params: this.auth() }).pipe(
      map(mapSellwinOrderDetail),
    );
  }

  convertCartToOrder(cartId: number): Observable<{ order_id: number; orderNumber: string }> {
    return this.http.post<any>(`${environment.apiUrl}/cart/${cartId}/convert`, {}, { params: this.auth() });
  }

  updateOrderStatus(id: number, status: string): Observable<OrderDetail> {
    return this.http.put<any>(`${this.wc}/orders/${id}`, { status }, { params: this.auth() }).pipe(
      map(mapWCOrderDetail),
    );
  }

  // ─── ACTIVE / ABANDONED CARTS (require plugin) ──────

  getActiveCarts(minutes: number = 5): Observable<ActiveCart[]> {
    return this.http.get<ActiveCart[]>(`${environment.apiUrl}/active-carts`, {
      params: this.auth().set('minutes', minutes),
    }).pipe(
      map((carts) => carts || []),
      catchError(() => of([] as ActiveCart[])),
    );
  }

  getAbandonedCarts(filters?: { filter?: string; search?: string; sort?: string; order?: string; page?: number; perPage?: number }): Observable<any> {
    let p = this.auth();
    if (filters) {
      if (filters.filter) p = p.set('filter', filters.filter);
      if (filters.search) p = p.set('search', filters.search);
      if (filters.sort) p = p.set('sort', filters.sort);
      if (filters.order) p = p.set('order', filters.order);
      if (filters.page) p = p.set('page', String(filters.page));
      if (filters.perPage) p = p.set('per_page', String(filters.perPage));
    }
    return this.http.get<any>(`${environment.apiUrl}/abandoned-carts`, { params: p }).pipe(
      catchError(() => of({ carts: [], total: 0, page: 1, perPage: 50, totalPages: 1 })),
    );
  }

  getCartBountyCarts(filters?: { page?: number; perPage?: number; status?: string; search?: string; orderby?: string; order?: string; idleMinutes?: number; timeRange?: string }): Observable<any> {
    let p = this.auth();
    if (filters) {
      if (filters.page) p = p.set('page', String(filters.page));
      if (filters.perPage) p = p.set('per_page', String(filters.perPage));
      if (filters.status) p = p.set('status', filters.status);
      if (filters.search) p = p.set('search', filters.search);
      if (filters.orderby) p = p.set('orderby', filters.orderby);
      if (filters.order) p = p.set('order', filters.order);
      if (filters.idleMinutes) p = p.set('idle_minutes', String(filters.idleMinutes));
      if (filters.timeRange) p = p.set('time_range', filters.timeRange);
    }
    return this.http.get<any>(`${environment.apiUrl}/carts`, { params: p }).pipe(
      catchError(() => of({ carts: [], total: 0, totalPages: 1 })),
    );
  }

  getCartBountyCart(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/carts/${id}`, { params: this.auth() });
  }

  updateCartStatus(cartId: number, status: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/carts/${cartId}/status`, { status }, { params: this.auth() });
  }

  markWhatsAppContacted(cartId: number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/carts/${cartId}/whatsapp`, {}, { params: this.auth() });
  }

  deleteCartBountyCart(cartId: number): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/carts/${cartId}`, { params: this.auth() });
  }

  getCartBountyStats(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/stats`, { params: this.auth() }).pipe(
      catchError(() => of({ total: 0, active: 0, recovered: 0, total_value: 0 })),
    );
  }

  getCustomer(mobile: string): Observable<CustomerHistory> {
    return this.http.get<CustomerHistory>(`${environment.apiUrl}/customer/${mobile}`, { params: this.auth() }).pipe(
      catchError(() => throwError(() => new Error('Customer search requires the Sellwin plugin'))),
    );
  }

  // ─── TRENDS ──────────────────────────────────────────

  getRevenueTrend(days: number = 30): Observable<RevenueTrend[]> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    const params = this.auth()
      .set('after', start.toISOString())
      .set('per_page', '100');

    return this.http.get<any[]>(`${this.wc}/orders`, { params }).pipe(
      map((orders) => {
        const byDate: Record<string, number> = {};
        orders.forEach((o) => {
          const d = o.date_created?.slice(0, 10);
          if (d) byDate[d] = (byDate[d] || 0) + parseFloat(o.total || '0');
        });

        const trend: RevenueTrend[] = [];
        const cursor = new Date(start);
        const end = new Date();
        while (cursor <= end) {
          const key = cursor.toISOString().slice(0, 10);
          trend.push({ date: key, revenue: byDate[key] || 0 });
          cursor.setDate(cursor.getDate() + 1);
        }
        return trend;
      }),
    );
  }

  getOrdersTrend(days: number = 30): Observable<OrdersTrend[]> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    const params = this.auth()
      .set('after', start.toISOString())
      .set('per_page', '100');

    return this.http.get<any[]>(`${this.wc}/orders`, { params }).pipe(
      map((orders) => {
        const byDate: Record<string, number> = {};
        orders.forEach((o) => {
          const d = o.date_created?.slice(0, 10);
          if (d) byDate[d] = (byDate[d] || 0) + 1;
        });

        const trend: OrdersTrend[] = [];
        const cursor = new Date(start);
        const end = new Date();
        while (cursor <= end) {
          const key = cursor.toISOString().slice(0, 10);
          trend.push({ date: key, orders: byDate[key] || 0 });
          cursor.setDate(cursor.getDate() + 1);
        }
        return trend;
      }),
    );
  }

  getAbandonedTrend(days: number = 7): Observable<AbandonedTrend[]> {
    return this.http.get<AbandonedTrend[]>(`${environment.apiUrl}/abandoned-trend`, { params: this.auth().set('days', days) }).pipe(
      catchError(() => of([] as AbandonedTrend[])),
    );
  }

  // ─── PRODUCTS ────────────────────────────────────────

  uploadPdf(blob: Blob, filename: string): Observable<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', blob, filename);
    return this.http.post<any>(`${environment.apiUrl}/pdf/upload`, formData, { params: this.auth() });
  }

  getTopProducts(limit: number = 10): Observable<TopProduct[]> {
    return this.http.get<any[]>(`${this.wc}/reports/top_sellers`, {
      params: this.auth().set('period', 'year'),
    }).pipe(
      map((items) =>
        items.slice(0, limit).map((item) => ({
          productId: item.product_id,
          name: item.name || 'Unknown',
          image: '',
          price: 0,
          orderCount: item.quantity || item.total_sales || 0,
        })),
      ),
    );
  }

  getInventoryProducts(search: string = ''): Observable<InventoryResponse> {
    let params = this.auth()
      .set('per_page', '100')
      .set('status', 'publish')
      .set('orderby', 'title')
      .set('order', 'asc');
    if (search.trim()) params = params.set('search', search.trim());

    const getPage = (page: number) => this.http.get<any[]>(`${this.wc}/products`, {
      params: params.set('page', String(page)),
      observe: 'response',
    });

    return getPage(1).pipe(
      switchMap((first) => {
        const total = Number(first.headers.get('X-WP-Total') || (first.body || []).length);
        const totalPages = Number(first.headers.get('X-WP-TotalPages') || 1);
        if (totalPages <= 1) return of({ total, products: mapInventoryProducts(first.body || []) });

        const remaining = Array.from({ length: totalPages - 1 }, (_, index) => getPage(index + 2));
        return forkJoin(remaining).pipe(
          map((responses) => ({
            total,
            products: mapInventoryProducts([
              ...(first.body || []),
              ...responses.flatMap((response) => response.body || []),
            ]),
          })),
        );
      }),
    );
  }
}

// ─── MAPPERS ─────────────────────────────────────────

function mapWCOrder(o: any): Order {
  const billingName = [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ');
  return {
    id: o.id,
    orderNumber: o.number || String(o.id),
    customerName: billingName || 'Guest',
    mobile: formatIndianMobile(o.billing?.phone || ''),
    email: o.billing?.email || '',
    total: parseFloat(o.total || '0'),
    status: o.status || 'pending',
    dateCreated: o.date_created || '',
    paymentMethod: o.payment_method_title || '',
    currency: o.currency || 'INR',
  };
}

function mapInventoryProducts(products: any[]): InventoryProduct[] {
  return products.map((product): InventoryProduct => ({
    id: product.id,
    name: product.name || 'Unnamed product',
    sku: product.sku || '',
    image: product.images?.[0]?.src || '',
    price: Number(product.price || 0),
    stockQuantity: product.stock_quantity === null ? null : Number(product.stock_quantity),
    stockStatus: product.stock_status || 'instock',
    manageStock: Boolean(product.manage_stock),
    totalSales: Number(product.total_sales || 0),
  }));
}

function mapWCOrderDetail(o: any): OrderDetail {
  const items = (o.line_items || []).map((li: any) => ({
    productId: li.product_id,
    name: li.name,
    model: getLineItemModel(li),
    sku: li.sku || '',
    quantity: li.quantity,
    price: parseFloat(li.price || '0'),
    subtotal: parseFloat(li.subtotal || '0'),
    image: li.image?.src || '',
    imageBase64: null,
  }));

  return {
    id: o.id,
    orderNumber: o.number || String(o.id),
    status: o.status || 'pending',
    currency: o.currency || 'INR',
    dateCreated: o.date_created || '',
    datePaid: o.date_paid || '',
    paymentMethod: o.payment_method_title || '',
    customer: {
      name: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ') || 'Guest',
      mobile: formatIndianMobile(o.billing?.phone || ''),
      email: o.billing?.email || '',
    },
    billing: {
      company: o.billing?.company || '',
      firstName: o.billing?.first_name || '',
      lastName: o.billing?.last_name || '',
      mobile: formatIndianMobile(o.billing?.phone || ''),
      email: o.billing?.email || '',
      address1: o.billing?.address_1 || '',
      address2: o.billing?.address_2 || '',
      city: o.billing?.city || '',
      state: o.billing?.state || '',
      postcode: o.billing?.postcode || '',
      country: o.billing?.country || '',
    },
    shipping: {
      company: o.shipping?.company || '',
      firstName: o.shipping?.first_name || '',
      lastName: o.shipping?.last_name || '',
      mobile: formatIndianMobile(o.shipping?.phone || ''),
      email: '',
      address1: o.shipping?.address_1 || '',
      address2: o.shipping?.address_2 || '',
      city: o.shipping?.city || '',
      state: o.shipping?.state || '',
      postcode: o.shipping?.postcode || '',
      country: o.shipping?.country || '',
    },
    products: items,
    subtotal: parseFloat(o.subtotal || '0'),
    discountTotal: parseFloat(o.discount_total || '0'),
    taxTotal: parseFloat(o.total_tax || '0'),
    shippingTotal: parseFloat(o.shipping_total || '0'),
    total: parseFloat(o.total || '0'),
    note: o.customer_note || '',
  };
}

function getLineItemModel(lineItem: any): string {
  const metadata = Array.isArray(lineItem?.meta_data) ? lineItem.meta_data : [];
  const values: string[] = [];

  metadata.forEach((meta: any) => {
    const key = String(meta?.key || '').trim();
    const displayKey = String(meta?.display_key ?? meta?.displayKey ?? '').trim();
    const rawValue = meta?.display_value ?? meta?.value ?? meta?.displayValue ?? '';
    const value = typeof rawValue === 'object'
      ? Object.values(rawValue).map((entry) => String(entry)).join(' / ').trim()
      : String(rawValue).trim();
    if (!key || !value) return;

    const searchableKey = `${key} ${displayKey}`.toLowerCase();
    const normalizedKey = searchableKey.replace(/^attribute_/, '').replace(/^pa_/, '');
    const isVariationAttribute = (!key.startsWith('_') || /model|variant|colour|color|size/i.test(displayKey))
      && (searchableKey.startsWith('attribute_')
      || searchableKey.startsWith('pa_')
      || /model|variant|colour|color|size/i.test(normalizedKey));
    if (!isVariationAttribute) return;

    if (!values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      values.push(value);
    }
  });

  const variation = lineItem?.variation || lineItem?.variation_data || lineItem?.attributes;
  if (variation && typeof variation === 'object') {
    Object.entries(variation).forEach(([key, rawValue]) => {
      const value = String(rawValue ?? '').trim();
      if (value && /model|variant|colour|color|size|attribute|pa_/i.test(key)
        && !values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
        values.push(value);
      }
    });
  }

  return values.join(' / ');
}

function formatIndianMobile(mobile: string): string {
  const digits = (mobile || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return mobile.startsWith('+') ? mobile : `+${digits}`;
}

function mapSellwinOrderDetail(o: any): OrderDetail {
  return {
    id: o.id,
    orderNumber: o.orderNumber || String(o.id),
    status: o.status || 'pending',
    currency: o.currency || 'INR',
    dateCreated: o.dateCreated || '',
    datePaid: o.datePaid || '',
    paymentMethod: o.paymentMethod || '',
    customer: {
      name: o.customer?.name || 'Guest',
      mobile: formatIndianMobile(o.customer?.mobile || ''),
      email: o.customer?.email || '',
    },
    billing: {
      company: o.billing?.company || '',
      firstName: o.billing?.firstName || '',
      lastName: o.billing?.lastName || '',
      mobile: formatIndianMobile(o.billing?.mobile || ''),
      email: o.billing?.email || '',
      address1: o.billing?.address1 || '',
      address2: o.billing?.address2 || '',
      city: o.billing?.city || '',
      state: o.billing?.state || '',
      postcode: o.billing?.postcode || '',
      country: o.billing?.country || '',
    },
    shipping: {
      company: o.shipping?.company || '',
      firstName: o.shipping?.firstName || '',
      lastName: o.shipping?.lastName || '',
      mobile: formatIndianMobile(o.shipping?.mobile || ''),
      email: '',
      address1: o.shipping?.address1 || '',
      address2: o.shipping?.address2 || '',
      city: o.shipping?.city || '',
      state: o.shipping?.state || '',
      postcode: o.shipping?.postcode || '',
      country: o.shipping?.country || '',
    },
    products: (o.products || []).map((p: any) => ({
      productId: p.productId,
      name: p.name,
      model: p.model || p.variation || p.variant || '',
      sku: p.sku || '',
      quantity: p.quantity,
      price: parseFloat(p.price || '0'),
      subtotal: parseFloat(p.subtotal || '0'),
      image: p.image || '',
      imageBase64: p.imageBase64 || null,
    })),
    subtotal: parseFloat(o.subtotal || '0'),
    discountTotal: parseFloat(o.discountTotal || '0'),
    taxTotal: parseFloat(o.taxTotal || '0'),
    shippingTotal: parseFloat(o.shippingTotal || '0'),
    total: parseFloat(o.total || '0'),
    note: o.note || '',
  };
}
