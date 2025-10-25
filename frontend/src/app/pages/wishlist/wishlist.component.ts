import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { WishlistService } from "../../services/wishlist.service";
import { CartService } from "../../services/cart.service";
import { AlbumService } from "../../services/album.service";
import { Album } from "../../models/album.model";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";
import { ContentLayoutComponent } from "../../components/shared/content-layout/content-layout.component";

@Component({
  selector: "app-wishlist",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SpinnerComponent,
    ContentLayoutComponent,
  ],
  templateUrl: "./wishlist.component.html",
  styleUrls: ["./wishlist.component.css"],
})
export class WishlistComponent implements OnInit, OnDestroy {
  wishlistItems: Album[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private wishlistService: WishlistService,
    private cartService: CartService,
    private albumService: AlbumService,
    private router: Router,
  ) {}

  /**
   * Ng On Init
   *
   * Initializes component and loads wishlist
   *
   * @return void
   */
  ngOnInit(): void {
    // Subscribe to real-time wishlist updates
    this.wishlistService
      .getRealTimeWishlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (albums) => {
          this.wishlistItems = albums;
          this.isLoading = false;
        },
        error: () => {
          this.wishlistItems = [];
          this.isLoading = false;
        },
      });

    // Track loading state
    this.wishlistService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => (this.isLoading = loading));

    // Force refresh
    this.wishlistService.refreshWishlist();
  }

  /**
   * Ng On Destroy
   *
   * Cleans up subscriptions
   *
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * View Album
   *
   * Navigates to album detail page (called when clicking on card)
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  viewAlbum(event: Event, albumId: string): void {
    // Check if the click came from a button
    const target = event.target as HTMLElement;
    if (
      target.closest(".album-icon-btn") ||
      target.closest("button")
    ) {
      return;
    }

    this.router.navigate(["/album", albumId]);
  }

  /**
   * View Album Info
   *
   * Navigates to album detail page (called when clicking info button)
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  viewAlbumInfo(event: Event, albumId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(["/album", albumId]);
  }

  /**
   * Add To Cart
   *
   * Adds album to cart from wishlist
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  addToCart(event: Event, albumId: string): void {
    event.stopPropagation();
    this.cartService.addToCart(albumId, 1).subscribe();
  }

  /**
   * Toggle Wishlist
   *
   * Removes album from wishlist
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  toggleWishlist(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggleWishlist(albumId).subscribe();
  }

  /**
   * Get Main Image URL
   *
   * Gets primary image URL with fallback
   *
   * @param (Album) album - Album object
   * @return string Image URL
   */
  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  /**
   * Format Price
   *
   * Formats price as currency string
   *
   * @param (number) price - Price value
   * @return string Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * Get Truncated Description
   *
   * Smart truncation that respects word boundaries
   *
   * @param (string) description - Full description text
   * @return string Truncated description with ellipsis
   */
  getTruncatedDescription(description: string): string {
    if (!description) return "";

    const maxLength = 85; // ~2 lines

    if (description.length <= maxLength) {
      return description;
    }

    let truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }

    // Remove trailing punctuation
    truncated = truncated.replace(/[.,;:!?-]+$/, "");

    return truncated + "...";
  }

  /**
   * Track By Album
   *
   * TrackBy function for ngFor performance
   *
   * @param (number) index - Item index
   * @param (Album) album - Album object
   * @return string Unique identifier
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}