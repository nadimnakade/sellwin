import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="page-container max-w-3xl">
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="text-surface-500 mt-1">Manage your dashboard preferences</p>
        </div>
      </div>

      <div class="space-y-6">
        <!-- Appearance -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">Appearance</h3>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-surface-700 dark:text-surface-300">Dark Mode</p>
              <p class="text-xs text-surface-400 mt-0.5">Toggle between light and dark theme</p>
            </div>
            <button (click)="auth.toggleDarkMode()"
                    class="relative w-12 h-6 rounded-full transition-colors duration-200"
                    [class.bg-primary-600]="auth.isDarkMode()"
                    [class.bg-surface-300]="!auth.isDarkMode()">
              <div class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                   [class.translate-x-6]="auth.isDarkMode()"
                   [class.translate-x-0.5]="!auth.isDarkMode()">
              </div>
            </button>
          </div>
        </div>

        <!-- WhatsApp -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">WhatsApp Settings</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Default Follow-up Message</label>
              <textarea class="input-field h-24" readonly
                        >Hi, you recently added products to your cart on Sellwin. Can we help you complete your order?</textarea>
              <p class="text-xs text-surface-400 mt-1">This message is used when recovering abandoned carts</p>
            </div>
          </div>
        </div>

        <!-- API -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">API Endpoints</h3>
          <div class="space-y-2">
            @for (endpoint of apiEndpoints; track endpoint) {
              <div class="flex items-center gap-2 text-sm">
                <span class="px-2 py-0.5 rounded text-xs font-mono font-bold"
                      [class]="endpoint.method === 'GET' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'">
                  {{ endpoint.method }}
                </span>
                <code class="text-surface-600 dark:text-surface-400 font-mono text-xs">{{ endpoint.path }}</code>
              </div>
            }
          </div>
        </div>

        <!-- About -->
        <div class="glass-card p-6">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-white mb-4">About</h3>
          <div class="space-y-2 text-sm text-surface-600 dark:text-surface-400">
            <p><span class="font-medium text-surface-700 dark:text-surface-300">Version:</span> 1.0.0</p>
            <p><span class="font-medium text-surface-700 dark:text-surface-300">Plugin:</span> Sellwin Cart Tracker</p>
            <p><span class="font-medium text-surface-700 dark:text-surface-300">Framework:</span> Angular 20 + WordPress</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  auth = inject(AuthService);

  apiEndpoints = [
    { method: 'GET', path: '/wp-json/wc/v3/dashboard' },
    { method: 'GET', path: '/wp-json/wc/v3/orders' },
    { method: 'GET', path: '/wp-json/wc/v3/order/{id}' },
    { method: 'GET', path: '/wp-json/sellwin/v1/active-carts' },
    { method: 'GET', path: '/wp-json/sellwin/v1/abandoned-carts' },
    { method: 'GET', path: '/wp-json/wc/v3/customer/{mobile}' },
    { method: 'GET', path: '/wp-json/wc/v3/revenue-trend' },
    { method: 'GET', path: '/wp-json/wc/v3/orders-trend' },
    { method: 'GET', path: '/wp-json/sellwin/v1/abandoned-trend' },
    { method: 'GET', path: '/wp-json/wc/v3/top-products' },
    { method: 'GET', path: '/wp-json/wc/v3/auth/check' },
  ];
}
