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
   * Initialize Component
   * Sets up album data and subscriptions
   *
   * @return (void)
   */
  ngOnInit(): void {
    this.mainImageUrl = this.albumService.getMainImageUrl(this.album);

    // Subscribe to wishlist status
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
   * Should Hide Content
   * Determines if content should be hidden
   *
   * @return (boolean) True if should hide
   */
  shouldHideContent(): boolean {
    return this.albumIndex !== undefined && this.albumIndex > 10;
  }

  /**
   * Should Prevent Image Click
   * Determines if image click should be prevented
   *
   * @return (boolean) True if should prevent
   */
  shouldPreventImageClick(): boolean {
    return false;
  }

  /**
   * Handle Image Click
   * Handles click on album image
   *
   * @param (Event) event - Click event
   * @return (void)
   */
  handleImageClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Prevent navigation if clicking on interactive elements
    if (
      target.closest(".overlay-icon-btn") ||
      target.closest(".center-icon-btn") ||
      target.closest(".cart-counter") ||
      target.closest(".overlay-cart-counter") ||
      target.closest(".red-overlay-icon-btn") ||
      target.closest(".red-overlay-cart-counter")
    ) {
      return;
    }

    this.viewAlbum(event);
  }

  /**
   * Check Cart Status
   * Checks if album is in cart
   *
   * @return (void)
   */
  private checkCartStatus(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      const cartItem = cart.items.find(
        (item) => item.album._id === this.album._id
      );
      if (cartItem) {
        this.cartQuantity = cartItem.quantity;
        this.cartItemId = cartItem._id;
        this.showCartCounter = true;
      } else {
        this.cartQuantity = 1;
        this.cartItemId = null;
        this.showCartCounter = false;
      }
    });
  }

  /**
   * View Album
   * Navigates to album detail page
   *
   * @param (Event) event - Click event
   * @return (void)
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
   * Add To Cart
   * Adds album to cart
   *
   * @param (Event) event - Click event
   * @return (void)
   */
  addToCart(event: Event): void {
    event.stopPropagation();
    if (this.isCartLoading || !this.album.inStock || this.isAddingToCart)
      return;

    this.isAddingToCart = true;
    this.isCartLoading = true;

    if (this.showHover || this.hasBlackBackground || this.hasRedBackground) {
      this.showCartCounter = true;
      this.cartQuantity = 1;

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
   * Increment Cart
   * Increases cart quantity
   *
   * @param (Event) event - Click event
   * @return (void)
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
   * Decrement Cart
   * Decreases cart quantity
   *
   * @param (Event) event - Click event
   * @return (void)
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
   * Toggle Wishlist
   * Adds or removes album from wishlist
   *
   * @param (Event) event - Click event
   * @return (void)
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
   * Get Formatted Price
   * Returns formatted price string
   *
   * @return (string) Formatted price
   */
  getFormattedPrice(): string {
    return this.albumService.formatPrice(this.album.price);
  }

  /**
   * Format Original Price
   * Returns formatted original price
   *
   * @return (string) Formatted price
   */
  formatOriginalPrice(): string {
    return this.album.originalPrice
      ? this.albumService.formatPrice(this.album.originalPrice)
      : "";
  }

  /**
   * Get Truncated Description
   * Returns truncated description
   *
   * @return (string) Truncated description
   */
  getTruncatedDescription(): string {
    const maxLength = 100;
    return this.album.description.length <= maxLength
      ? this.album.description
      : `${this.album.description.substring(0, maxLength)}...`;
  }

  /**
   * Should Show Text Overlay
   * Determines if text overlay should show
   *
   * @return (boolean) True if should show
   */
  get shouldShowTextOverlay(): boolean {
    return this.showTextOverlay;
  }

  /**
   * Has Text Overlay
   * Checks if card has text overlay
   *
   * @return (boolean) True if has overlay
   */
  get hasTextOverlay(): boolean {
    return this.showTextOverlay;
  }
}
