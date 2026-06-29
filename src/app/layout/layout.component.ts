import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgClass, UpperCasePipe } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass, UpperCasePipe],
  template: `
    <div class="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
      <!-- Sidebar Overlay -->
      <div class="fixed inset-0 bg-black/40 z-20 transition-opacity duration-300"
           [class.opacity-0]="!sidebarOpen()"
           [class.pointer-events-none]="!sidebarOpen()"
           [class.opacity-100]="sidebarOpen()"
           (click)="sidebarOpen.set(false)"></div>

      <!-- Sidebar -->
      <aside [ngClass]="{
        'translate-x-0': sidebarOpen(),
        '-translate-x-full': !sidebarOpen()
      }" class="fixed inset-y-0 left-0 z-30 w-64 transition-transform duration-300 ease-out flex flex-col bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-6 h-16 border-b border-surface-200 dark:border-surface-800">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <span class="text-white font-bold text-sm">S</span>
          </div>
          <span class="font-bold text-lg text-surface-900 dark:text-white">Sellwin</span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto p-4 space-y-1">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium"
               [routerLinkActiveOptions]="{exact: item.route === '/dashboard'}"
               class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all duration-200">
              <i [class]="item.icon + ' text-lg w-5 text-center'"></i>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-surface-200 dark:border-surface-800">
          <button (click)="auth.logout()"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-surface-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-all">
            <i class="pi pi-sign-out text-lg"></i>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Top Header -->
        <header class="h-16 bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4 lg:px-6">
          <button (click)="sidebarOpen.set(!sidebarOpen())" class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <i class="pi pi-bars text-lg text-surface-600 dark:text-surface-400"></i>
          </button>

          <div class="hidden lg:flex items-center gap-2 text-sm text-surface-500">
            <i class="pi pi-clock"></i>
            <span>{{ currentTime }}</span>
          </div>

          <div class="flex items-center gap-3">
            <button (click)="auth.toggleDarkMode()"
                    class="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">
              @if (auth.isDarkMode()) {
                <i class="pi pi-sun text-lg text-yellow-500"></i>
              } @else {
                <i class="pi pi-moon text-lg text-surface-500"></i>
              }
            </button>
            <div class="flex items-center gap-2 pl-3 border-l border-surface-200 dark:border-surface-700">
              <div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold text-sm">
                {{ (auth.currentUser()?.user?.username?.[0] || 'A') | uppercase }}
              </div>
              <div class="hidden sm:block">
                <p class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ auth.currentUser()?.user?.username || 'Admin' }}</p>
                <p class="text-xs text-surface-400">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  auth = inject(AuthService);
  sidebarOpen = signal(false);
  currentTime = '';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard' },
    { label: 'Orders', icon: 'pi pi-shopping-cart', route: '/orders' },
    { label: 'Active Carts', icon: 'pi pi-clock', route: '/active-carts' },
    { label: 'Latest Cart Changes', icon: 'pi pi-exclamation-triangle', route: '/latest-carts' },
    { label: 'Customers', icon: 'pi pi-users', route: '/customers' },
    { label: 'Settings', icon: 'pi pi-cog', route: '/settings' },
  ];

  constructor() {
    this.sidebarOpen.set(window.innerWidth >= 1024);
    this.updateTime();
    setInterval(() => this.updateTime(), 60000);
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
