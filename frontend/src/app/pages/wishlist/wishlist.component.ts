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
    private router: Router
  ) {}

  /**
   * ngOnInit
   * Initialize component and load wishlist
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

    // Track global loading state
    this.wishlistService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => (this.isLoading = loading));

    // Force refresh wishlist data
    this.wishlistService.refreshWishlist();
  }

  /**
   * ngOnDestroy
   * Cleanup subscriptions
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * viewAlbum
   * Navigate to album detail page
   * @param event Click event
   * @param albumId Album ID
   * @return void
   */
  viewAlbum(event: Event, albumId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(["/album", albumId]);
  }

  /**
   * addToCart
   * Add album to cart from wishlist
   * @param event Click event
   * @param albumId Album ID
   * @return void
   */
  addToCart(event: Event, albumId: string): void {
    event.stopPropagation();
    this.cartService.addToCart(albumId, 1).subscribe();
  }

  /**
   * toggleWishlist
   * Remove album from wishlist
   * @param event Click event
   * @param albumId Album ID
   * @return void
   */
  toggleWishlist(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggleWishlist(albumId).subscribe();
  }

  /**
   * getMainImageUrl
   * Get primary image URL with fallback
   * @param album Album object
   * @return string Image URL
   */
  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  /**
   * formatPrice
   * Format price as currency string
   * @param price Price value
   * @return string Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * trackByAlbum
   * TrackBy function for ngFor performance
   * @param index Item index
   * @param album Album object
   * @return string Unique identifier
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}
