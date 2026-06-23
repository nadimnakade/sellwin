import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError, map, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardStats, Order, OrderDetail, ActiveCart, AbandonedCart,
  CustomerHistory, RevenueTrend, OrdersTrend, AbandonedTrend,
  TopProduct, PaginatedResponse,
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

    return this.http.get<any[]>(`${this.wc}/orders`, { params }).pipe(
      map((orders) => {
        const revenueToday = orders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);
        return {
          ordersToday: orders.length,
          revenueToday,
          activeCarts: 0,
          abandonedCarts: 0,
        };
      }),
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

  // ─── ACTIVE / ABANDONED CARTS (require plugin) ──────

  getActiveCarts(): Observable<ActiveCart[]> {
    return this.http.get<ActiveCart[]>(`${environment.apiUrl}/active-carts`, { params: this.auth() }).pipe(
      map((carts) => carts || []),
      catchError(() => of([] as ActiveCart[])),
    );
  }

  getAbandonedCarts(): Observable<AbandonedCart[]> {
    return this.http.get<AbandonedCart[]>(`${environment.apiUrl}/abandoned-carts`, { params: this.auth() }).pipe(
      catchError(() => of([] as AbandonedCart[])),
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
}

// ─── MAPPERS ─────────────────────────────────────────

function mapWCOrder(o: any): Order {
  const billingName = [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(' ');
  return {
    id: o.id,
    orderNumber: o.number || String(o.id),
    customerName: billingName || 'Guest',
    mobile: o.billing?.phone || '',
    email: o.billing?.email || '',
    total: parseFloat(o.total || '0'),
    status: o.status || 'pending',
    dateCreated: o.date_created || '',
    paymentMethod: o.payment_method_title || '',
    currency: o.currency || 'INR',
  };
}

function mapWCOrderDetail(o: any): OrderDetail {
  const items = (o.line_items || []).map((li: any) => ({
    productId: li.product_id,
    name: li.name,
    sku: li.sku || '',
    quantity: li.quantity,
    price: parseFloat(li.price || '0'),
    subtotal: parseFloat(li.subtotal || '0'),
    image: li.image?.src || '',
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
      mobile: o.billing?.phone || '',
      email: o.billing?.email || '',
    },
    billing: {
      firstName: o.billing?.first_name || '',
      lastName: o.billing?.last_name || '',
      mobile: o.billing?.phone || '',
      email: o.billing?.email || '',
      address1: o.billing?.address_1 || '',
      address2: o.billing?.address_2 || '',
      city: o.billing?.city || '',
      state: o.billing?.state || '',
      postcode: o.billing?.postcode || '',
      country: o.billing?.country || '',
    },
    shipping: {
      firstName: o.shipping?.first_name || '',
      lastName: o.shipping?.last_name || '',
      mobile: o.shipping?.phone || '',
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
