import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../interfaces';

@Injectable({ providedIn: 'root' })
export class AuthService {
  isAuthenticated = signal<boolean>(this.checkStoredAuth());
  isDarkMode = signal<boolean>(localStorage.getItem('sellwin_dark_mode') === 'true');
  currentUser = signal<AuthUser>({
    authenticated: true,
    user: { id: 1, username: 'Admin', roles: ['administrator'] },
  });

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  login(): void {
    // Keys are embedded in environment - no interactive login needed
    this.isAuthenticated.set(true);
    localStorage.setItem('sellwin_auth', '1');
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    localStorage.removeItem('sellwin_auth');
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  checkSession(): Observable<boolean> {
    // Verify WooCommerce API keys work by fetching a single order
    const params = new URLSearchParams({
      consumer_key: environment.consumerKey,
      consumer_secret: environment.consumerSecret,
      per_page: '1',
    });

    return this.http.get<any[]>(`${environment.woocommerceUrl}/orders?${params}`).pipe(
      map(() => {
        this.isAuthenticated.set(true);
        localStorage.setItem('sellwin_auth', '1');
        return true;
      }),
      catchError(() => {
        if (!environment.production) {
          this.isAuthenticated.set(true);
          return of(true);
        }
        this.isAuthenticated.set(false);
        return of(false);
      }),
    );
  }

  toggleDarkMode(): void {
    this.isDarkMode.update((v) => !v);
    localStorage.setItem('sellwin_dark_mode', String(this.isDarkMode()));
    this.applyTheme();
  }

  applyTheme(): void {
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private checkStoredAuth(): boolean {
    return !!localStorage.getItem('sellwin_auth') || !environment.production;
  }
}
