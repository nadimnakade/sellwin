import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 to-surface-100 dark:from-surface-950 dark:to-surface-900 p-4">
      <div class="w-full max-w-md animate-slide-up">
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
            <span class="text-white font-bold text-2xl">S</span>
          </div>
          <h1 class="text-2xl font-bold text-surface-900 dark:text-white">Sellwin Admin</h1>
          <p class="text-surface-500 mt-1">WooCommerce Dashboard</p>
        </div>

        <div class="glass-card p-8 text-center">
          @if (error()) {
            <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              <i class="pi pi-exclamation-circle"></i> {{ error() }}
            </div>
          }

          <p class="text-surface-600 dark:text-surface-400 mb-6">
            Verify WooCommerce API connection to access the dashboard.
          </p>

          <button (click)="verifyAndLogin()" [disabled]="checking()"
                  class="btn-primary w-full justify-center py-2.5 disabled:opacity-50">
            @if (checking()) {
              <i class="pi pi-spin pi-spinner"></i>
              Verifying...
            } @else {
              <i class="pi pi-lock-open"></i>
              Connect to Dashboard
            }
          </button>
        </div>

        <p class="text-center text-xs text-surface-400 mt-6">
          Authenticated via WooCommerce API Keys
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  error = signal('');
  checking = signal(false);

  verifyAndLogin(): void {
    this.checking.set(true);
    this.error.set('');

    this.auth.checkSession().subscribe({
      next: (ok) => {
        this.checking.set(false);
        if (ok) {
          this.auth.login();
        } else {
          this.error.set('Cannot connect to WooCommerce. Check your API keys in environment config.');
        }
      },
      error: () => {
        this.checking.set(false);
        this.error.set('Connection failed. Verify your WooCommerce API keys.');
      },
    });
  }
}
