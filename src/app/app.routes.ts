import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((c) => c.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((c) => c.DashboardComponent),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/orders.component').then((c) => c.OrdersComponent),
      },
      {
        path: 'orders/:id',
        loadComponent: () => import('./features/orders/order-detail.component').then((c) => c.OrderDetailComponent),
      },
      {
        path: 'active-carts',
        loadComponent: () => import('./features/active-carts/active-carts.component').then((c) => c.ActiveCartsComponent),
      },
      {
        path: 'latest-carts',
        loadComponent: () => import('./features/abandoned-carts/abandoned-carts.component').then((c) => c.AbandonedCartsComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers.component').then((c) => c.CustomersComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then((c) => c.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
