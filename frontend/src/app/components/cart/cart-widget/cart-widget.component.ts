/**
 * Cart Widget Component
 * Displays shopping cart summary in sidebar
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { CartService } from "../../../services/cart.service";
import { AlbumService } from "../../../services/album.service";
import { Cart, CartItem } from "../../../models/cart.model";

@Component({
  selector: "app-cart-widget",
  templateUrl: "./cart-widget.component.html",
  styleUrls: ["./cart-widget.component.css"]})
export class CartWidgetComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private albumService: AlbumService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to cart updates
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cart = cart;
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Remove item from cart
   * @param itemId Cart item ID
   */
  removeItem(itemId: string): void {
    this.cartService.removeFromCart(itemId).subscribe({
      error: (error) => {
        console.error("Failed to remove item:", error);
      }});
  }

  /**
   * Navigate to checkout
   */
  goToCheckout(): void {
    this.router.navigate(["/checkout"]);
  }

  /**
   * Get album image URL
   * @param item Cart item
   * @returns Image URL
   */
  getImageUrl(item: CartItem): string {
    return this.albumService.getMainImageUrl(item.album);
  }

  /**
   * Format price
   * @param price Price value
   * @returns Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * Calculate item total
   * @param item Cart item
   * @returns Item total price
   */
  getItemTotal(item: CartItem): string {
    const total = item.album.price * item.quantity;
    return this.formatPrice(total);
  }
}
