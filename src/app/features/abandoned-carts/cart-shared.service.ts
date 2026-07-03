import { Injectable } from '@angular/core';
import { CartBountyCart } from './abandoned-carts.component';

@Injectable({ providedIn: 'root' })
export class CartSharedService {
  private cart: CartBountyCart | null = null;

  setCart(cart: CartBountyCart): void {
    this.cart = cart;
  }

  getCart(): CartBountyCart | null {
    return this.cart;
  }

  clearCart(): void {
    this.cart = null;
  }
}