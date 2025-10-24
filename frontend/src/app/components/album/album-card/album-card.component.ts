import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { Album } from "../../../models/album.model";
import { CartService } from "../../../services/cart.service";
import { AlbumService } from "../../../services/album.service";
import { WishlistService } from "../../../services/wishlist.service";
import { CartResponse } from "../../../models/cart.model";

@Component({
  selector: "app-album-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./album-card.component.html",
  styleUrls: ["./album-card.component.css"],
})
export class AlbumCardComponent implements OnInit, OnDestroy {
  @Input() album!: Album;
  @Input() size: "small" | "medium" | "large" = "medium";
  @Input() showHover = false;
  @Input() showInfo = false;
  @Input() showPrice = false;
  @Input() showTextOverlay = false;
  @Input() showArtistFirst = false;
  @Input() hasBlackBackground = false;
  @Input() hasRedBackground = false;
  @Input() hasRedArtist = false;
  @Input() showDescription = false;
  @Input() showWishlistButton = false;
  @Input() albumIndex?: number;

  isHovered = false;
  isInWishlist = false;
  mainImageUrl = "";

  isWishlistLoading = false;
  isCartLoading = false;
  isInfoLoading = false;
  isAddingToCart = false;

  showCartCounter = false;
  cartQuantity = 1;
  isUpdatingCart = false;

  private destroy$ = new Subject<void>();
  private cartItemId: string | null = null;

  constructor(
    private router: Router,
    private cartService: CartService,
    private albumService: AlbumService,
    private wishlistService: WishlistService
  ) {}

  /**
   * ngOnInit
   * Initialize component, load album image and check wishlist/cart status
   * @return void
   */
  ngOnInit(): void {
    this.mainImageUrl = this.albumService.getMainImageUrl(this.album);

    // Subscribe to wishlist status changes
    this.wishlistService
      .isInWishlist(this.album._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inWishlist) => (this.isInWishlist = inWishlist),
        error: () => (this.isInWishlist = false),
      });

    this.checkCartStatus();
  }

  /**
   * ngOnDestroy
   * Cleanup subscriptions on component destruction
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * shouldHideContent
   * Determine if content section should be hidden based on album index
   * @return boolean - True if content should be hidden
   */
  shouldHideContent(): boolean {
    return this.albumIndex !== undefined && this.albumIndex > 10;
  }

  /**
   * shouldPreventImageClick
   * Check if image click navigation should be prevented
   * @return boolean - True if click should be prevented
   */
  shouldPreventImageClick(): boolean {
    return false; // ✅ תמיד נאפשר לחיצה על תמונה
  }

  /**
   * ✅ handleImageClick - NEW METHOD
   * Handle click on album image - navigate to album detail
   * @param (Event) event - Click event
   * @return void
   */
  handleImageClick(event: Event): void {
    // Don't navigate if clicking on buttons inside the overlay
    const target = event.target as HTMLElement;
    if (
      target.closest('.overlay-icon-btn') || 
      target.closest('.center-icon-btn') ||
      target.closest('.cart-counter') ||
      target.closest('.overlay-cart-counter')
    ) {
      return;
    }

    // Navigate to album detail
    this.viewAlbum(event);
  }

  /**
   * handleCardClick
   * Handle card click event - deprecated, kept for compatibility
   * @param (Event) event - Click event
   * @return void
   */
  handleCardClick(event: Event): void {
    // This method is no longer used but kept for backward compatibility
  }

  /**
   * checkCartStatus
   * Monitor cart changes and update local cart state
   * @return void
   */
  private checkCartStatus(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      const cartItem = cart.items.find(
        (item) => item.album._id === this.album._id
      );
      if (cartItem) {
        this.cartQuantity = cartItem.quantity;
        this.cartItemId = cartItem._id;
      } else {
        this.cartQuantity = 1;
        this.cartItemId = null;
        this.showCartCounter = false;
      }
    });
  }

  /**
   * viewAlbum
   * Navigate to album detail page
   * @param (Event) event - Click event
   * @return void
   */
  viewAlbum(event: Event): void {
    event.stopPropagation();
    if (this.showCartCounter) return;

    this.isInfoLoading = true;
    this.router
      .navigate(["/album", this.album._id])
      .finally(() => (this.isInfoLoading = false));
  }

  /**
   * addToCart
   * Add album to cart and show counter for hover cards
   * @param (Event) event - Click event
   * @return void
   */
  addToCart(event: Event): void {
    event.stopPropagation();
    if (this.hasRedBackground || this.isCartLoading || !this.album.inStock)
      return;

    this.isAddingToCart = true;

    // Show counter for hover cards
    if (this.showHover || this.hasBlackBackground) {
      this.showCartCounter = true;
      this.cartQuantity = 1;
      this.isCartLoading = true;

      this.cartService.addToCart(this.album._id, 1).subscribe({
        next: (response) => {
          this.isCartLoading = false;
          this.isAddingToCart = false;
          if (response.item) this.cartItemId = response.item._id;
        },
        error: () => {
          this.isCartLoading = false;
          this.isAddingToCart = false;
          this.showCartCounter = false;
        },
      });
      return;
    }

    // Regular add to cart
    this.isCartLoading = true;
    this.cartService.addToCart(this.album._id, 1).subscribe({
      next: () => {
        this.isCartLoading = false;
        this.isAddingToCart = false;
      },
      error: () => {
        this.isCartLoading = false;
        this.isAddingToCart = false;
      },
    });
  }

  /**
   * incrementCart
   * Increase cart quantity by 1
   * @param (Event) event - Click event
   * @return void
   */
  incrementCart(event: Event): void {
    event.stopPropagation();
    if (this.isUpdatingCart || this.cartQuantity >= this.album.stock) return;

    this.isUpdatingCart = true;
    const newQuantity = this.cartQuantity + 1;

    if (this.cartItemId) {
      this.cartService.updateCartItem(this.cartItemId, newQuantity).subscribe({
        next: () => {
          this.cartQuantity = newQuantity;
          this.isUpdatingCart = false;
        },
        error: () => (this.isUpdatingCart = false),
      });
    } else {
      this.cartService.addToCart(this.album._id, newQuantity).subscribe({
        next: (response: CartResponse) => {
          this.cartQuantity = newQuantity;
          if (response.item) this.cartItemId = response.item._id;
          this.isUpdatingCart = false;
        },
        error: () => (this.isUpdatingCart = false),
      });
    }
  }

  /**
   * decrementCart
   * Remove item from cart
   * @param (Event) event - Click event
   * @return void
   */
  decrementCart(event: Event): void {
    event.stopPropagation();
    if (this.isUpdatingCart) return;

    this.isUpdatingCart = true;

    if (this.cartItemId) {
      this.cartService.removeFromCart(this.cartItemId).subscribe({
        next: () => {
          this.showCartCounter = false;
          this.cartQuantity = 1;
          this.cartItemId = null;
          this.isUpdatingCart = false;
        },
        error: () => (this.isUpdatingCart = false),
      });
    } else {
      this.showCartCounter = false;
      this.cartQuantity = 1;
      this.isUpdatingCart = false;
    }
  }

  /**
   * toggleWishlist
   * Add or remove album from wishlist
   * @param (Event) event - Click event
   * @return void
   */
  toggleWishlist(event: Event): void {
    event.stopPropagation();
    if (this.isWishlistLoading) return;

    this.isWishlistLoading = true;
    this.wishlistService.toggleWishlist(this.album._id).subscribe({
      next: () => (this.isWishlistLoading = false),
      error: () => (this.isWishlistLoading = false),
    });
  }

  /**
   * getFormattedPrice
   * Format album price for display
   * @return string - Formatted price
   */
  getFormattedPrice(): string {
    return this.albumService.formatPrice(this.album.price);
  }

  /**
   * formatOriginalPrice
   * Format original price for display
   * @return string - Formatted original price
   */
  formatOriginalPrice(): string {
    return this.album.originalPrice
      ? this.albumService.formatPrice(this.album.originalPrice)
      : "";
  }

  /**
   * getTruncatedDescription
   * Get truncated version of album description
   * @return string - Truncated description
   */
  getTruncatedDescription(): string {
    const maxLength = 100;
    return this.album.description.length <= maxLength
      ? this.album.description
      : `${this.album.description.substring(0, maxLength)}...`;
  }

  // Getter for text overlay visibility
  get shouldShowTextOverlay(): boolean {
    return this.showTextOverlay;
  }

  get hasTextOverlay(): boolean {
    return this.showTextOverlay;
  }
}