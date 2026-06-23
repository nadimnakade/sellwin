import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WooCommerceApiService {
  private http = inject(HttpClient);
  private base = environment.woocommerceUrl;

  private authParams(): HttpParams {
    return new HttpParams()
      .set('consumer_key', environment.consumerKey)
      .set('consumer_secret', environment.consumerSecret);
  }

  getOrders(params?: { page?: number; perPage?: number; status?: string; search?: string }): Observable<any> {
    let p = this.authParams();
    if (params) {
      if (params.page) p = p.set('page', params.page);
      if (params.perPage) p = p.set('per_page', params.perPage);
      if (params.status) p = p.set('status', params.status);
      if (params.search) p = p.set('search', params.search);
    }
    return this.http.get(`${this.base}/orders`, { params: p });
  }

  getOrder(id: number): Observable<any> {
    return this.http.get(`${this.base}/orders/${id}`, { params: this.authParams() });
  }

  getCustomers(params?: { page?: number; perPage?: number }): Observable<any> {
    let p = this.authParams();
    if (params) {
      if (params.page) p = p.set('page', params.page);
      if (params.perPage) p = p.set('per_page', params.perPage);
    }
    return this.http.get(`${this.base}/customers`, { params: p });
  }

  getCustomerByEmail(email: string): Observable<any> {
    return this.http.get(`${this.base}/customers`, {
      params: this.authParams().set('email', email),
    });
  }

  getReports(): Observable<any> {
    return this.http.get(`${this.base}/reports/orders/totals`, { params: this.authParams() });
  }

  getProducts(params?: { page?: number; perPage?: number; category?: number }): Observable<any> {
    let p = this.authParams();
    if (params) {
      if (params.page) p = p.set('page', params.page);
      if (params.perPage) p = p.set('per_page', params.perPage);
      if (params.category) p = p.set('category', params.category);
    }
    return this.http.get(`${this.base}/products`, { params: p });
  }

  getReportsSales(period: string = 'today'): Observable<any> {
    return this.http.get(`${this.base}/reports/sales`, {
      params: this.authParams().set('period', period),
    });
  }

  getTopSellers(params?: { period?: string }): Observable<any> {
    let p = this.authParams();
    if (params?.period) p = p.set('period', params.period);
    return this.http.get(`${this.base}/reports/top_sellers`, { params: p });
  }
}
