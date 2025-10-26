import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { CartService } from "../../../services/cart.service";
import { AlbumService } from "../../../services/album.service";
import { Cart, CartItem } from "../../../models/cart.model";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-cart-widget",
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: "./cart-widget.component.html",
  styleUrls: ["./cart-widget.component.css"],
})
export class CartWidgetComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  isLoading = true;
  isRemovingItem: { [key: string]: boolean } = {};
  private destroy$ = new Subject<void>();

  constructor(
    private cartService: CartService,
    private albumService: AlbumService,
    private router: Router
  ) {}

  /**
   * Initialize Component
   * Subscribes to cart updates
   * 
   * @return (void)
   */
  ngOnInit(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cart = cart;
      this.isLoading = false;
    });
  }

  /**
   * Cleanup Component
   * Unsubscribes from observables
   * 
   * @return (void)
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Is In Album Page
   * Checks if currently viewing album detail
   * 
   * @return (boolean) True if in album page
   */
  isInAlbumPage(): boolean {
    return this.router.url.includes("/album/");
  }

  /**
   * Should Show Scroll
   * Determines if scrollbar should be visible
   * 
   * @return (boolean) True if scrollbar needed
   */
  shouldShowScroll(): boolean {
    // Show scroll after 2 items in album page, 3 elsewhere
    return this.isInAlbumPage()
      ? this.cart.items.length >= 3
      : this.cart.items.length > 2;
  }

  /**
   * Remove Item
   * Removes item from cart
   * 
   * @param (string) itemId - Cart item ID
   * @return (void)
   */
  removeItem(itemId: string): void {
    this.isRemovingItem[itemId] = true;
    this.cartService.removeFromCart(itemId).subscribe({
      next: () => delete this.isRemovingItem[itemId],
      error: () => delete this.isRemovingItem[itemId],
    });
  }

  /**
   * Go To Checkout
   * Navigates to checkout page
   * 
   * @return (void)
   */
  goToCheckout(): void {
    this.router.navigate(["/checkout"]);
  }

  /**
   * Go To Album
   * Navigates to album detail page
   * 
   * @param (string) albumId - Album ID
   * @return (void)
   */
  goToAlbum(albumId: string): void {
    this.router.navigate(["/album", albumId]);
  }

  /**
   * Get Image URL
   * Gets album image URL
   * 
   * @param (CartItem) item - Cart item
   * @return (string) Image URL
   */
  getImageUrl(item: CartItem): string {
    return this.albumService.getMainImageUrl(item.album);
  }

  /**
   * Format Price
   * Formats price for display
   * 
   * @param (number) price - Price value
   * @return (string) Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }
}