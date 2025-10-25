import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Subject, takeUntil, debounceTime, fromEvent } from "rxjs";
import { AlbumService } from "../../services/album.service";
import { CartService } from "../../services/cart.service";
import { WishlistService } from "../../services/wishlist.service";
import { Album } from "../../models/album.model";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";
import { AlbumCardComponent } from "../../components/album/album-card/album-card.component";
import { SidebarComponent } from "../../components/layout/sidebar/sidebar.component";
import { CartWidgetComponent } from "../../components/cart/cart-widget/cart-widget.component";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    AlbumCardComponent,
    SidebarComponent,
    CartWidgetComponent,
  ],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"],
})
export class HomeComponent implements OnInit, OnDestroy {
  // Album display groups
  featuredAlbum: Album | null = null;
  topAlbums: Album[] = [];
  sideAlbum10: Album | null = null;
  sideAlbum11: Album | null = null;
  remainingAlbums: Album[] = [];
  allAlbums: Album[] = [];

  // Loading states
  isLoading = true;
  isLoadingMore = false;
  hasMore = true;

  // Pagination
  currentPage = 1;
  readonly itemsPerPage = 23; // 1 featured + 8 top + 2 side + 12 grid
  totalPages = 1;
  totalItems = 0;

  // UI interaction states
  isWishlistLoadingMap: { [key: string]: boolean } = {};
  isCartLoadingMap: { [key: string]: boolean } = {};
  showCartCounter: { [key: string]: boolean } = {};
  cartQuantities: { [key: string]: number } = {};
  isUpdatingCart: { [key: string]: boolean } = {};
  cartItemIds: { [key: string]: string } = {};

  private wishlistIds = new Set<string>();
  private destroy$ = new Subject<void>();
  private readonly scrollThreshold = 300; // Pixels from bottom to trigger load

  constructor(
    private albumService: AlbumService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private router: Router
  ) {}

  /**
   * ngOnInit
   * Initialize component and load data
   * @return void
   */
  ngOnInit(): void {
    this.loadInitialAlbums();
    this.setupWishlistSubscription();
    this.setupCartSubscription();
    this.setupScrollListener();
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
   * setupWishlistSubscription
   * Subscribe to wishlist changes
   * @return void
   */
  private setupWishlistSubscription(): void {
    this.wishlistService.wishlistIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ids) => (this.wishlistIds = ids));

    this.wishlistService.itemLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loadingStates) => {
        loadingStates.forEach((isLoading, albumId) => {
          this.isWishlistLoadingMap[albumId] = isLoading;
        });
      });
  }

  /**
   * setupCartSubscription
   * Subscribe to cart changes to update UI counters
   * @return void
   */
  private setupCartSubscription(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      // Reset states
      this.showCartCounter = {};
      this.cartQuantities = {};
      this.cartItemIds = {};

      // Update for each cart item
      cart.items.forEach((item) => {
        const albumId = item.album._id;
        this.showCartCounter[albumId] = true;
        this.cartQuantities[albumId] = item.quantity;
        this.cartItemIds[albumId] = item._id;
      });
    });
  }

  /**
   * setupScrollListener
   * Setup infinite scroll with debounce
   * @return void
   */
  private setupScrollListener(): void {
    fromEvent(window, "scroll")
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.onScroll());
  }

  /**
   * onWindowScroll
   * Handle window scroll event (HostListener backup)
   * @return void
   */
  @HostListener("window:scroll", ["$event"])
  onWindowScroll(): void {
    this.onScroll();
  }

  /**
   * onScroll
   * Check if user scrolled near bottom and trigger load
   * @return void
   */
  private onScroll(): void {
    if (this.isLoadingMore || !this.hasMore) return;

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Trigger when within threshold of bottom
    if (scrollPosition >= documentHeight - this.scrollThreshold) {
      this.loadMoreAlbums();
    }
  }

  /**
   * loadInitialAlbums
   * Load first page of albums for home layout
   * @return void
   */
  private loadInitialAlbums(): void {
    this.isLoading = true;
    this.currentPage = 1;

    this.albumService
      .getNewAlbums(this.currentPage, this.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const results = response.results || [];
          const pagination = response.pagination || {
            page: 1,
            pages: 1,
            total: 0,
            limit: this.itemsPerPage,
          };

          this.processInitialAlbums(results);
          this.updatePaginationInfo(pagination);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.hasMore = false;
        },
      });
  }

  /**
   * loadMoreAlbums
   * Load next page for infinite scroll
   * @return void
   */
  private loadMoreAlbums(): void {
    if (!this.hasMore || this.isLoadingMore) return;

    this.isLoadingMore = true;
    const nextPage = this.currentPage + 1;

    this.albumService
      .getNewAlbums(nextPage, this.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const results = response.results || [];
          const pagination = response.pagination || {
            page: nextPage,
            pages: 1,
            total: 0,
            limit: this.itemsPerPage,
          };

          this.processAdditionalAlbums(results);
          this.currentPage = nextPage;
          this.updatePaginationInfo(pagination);
          this.isLoadingMore = false;
        },
        error: () => {
          this.isLoadingMore = false;
          this.hasMore = false;
        },
      });
  }

  /**
   * processInitialAlbums
   * Organize first page albums into layout groups
   * Layout: [0]=featured, [1-8]=top grid, [9-10]=sidebar, [11+]=main grid
   * @param (Album[]) albums - Albums to process
   * @return void
   */
  private processInitialAlbums(albums: Album[]): void {
    this.allAlbums = albums;

    if (albums.length > 0) {
      this.featuredAlbum = albums[0];
      this.topAlbums = albums.slice(1, 9);
      this.sideAlbum10 = albums[9] || null;
      this.sideAlbum11 = albums[10] || null;
      this.remainingAlbums = albums.slice(11);
    }
  }

  /**
   * processAdditionalAlbums
   * Add new albums from pagination to main grid
   * @param (Album[]) albums - New albums to append
   * @return void
   */
  private processAdditionalAlbums(albums: Album[]): void {
    if (albums.length === 0) {
      this.hasMore = false;
      return;
    }

    this.allAlbums = [...this.allAlbums, ...albums];

    // If initial layout incomplete, reorganize
    if (!this.featuredAlbum && albums.length > 0) {
      this.processInitialAlbums(this.allAlbums);
    } else {
      this.remainingAlbums = [...this.remainingAlbums, ...albums];
    }
  }

  /**
   * updatePaginationInfo
   * Update pagination state from API response
   * @param (any) pagination - Pagination data
   * @return void
   */
  private updatePaginationInfo(pagination: any): void {
    this.totalPages = pagination.pages || 1;
    this.totalItems = pagination.total || 0;
    this.hasMore = this.currentPage < this.totalPages;
  }

  /**
   * viewAlbum
   * Navigate to album detail page
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  viewAlbum(event: Event, albumId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(["/album", albumId]);
  }

  /**
   * addToCart
   * Add album to cart and show quantity counter
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  addToCart(event: Event, albumId: string): void {
    event.stopPropagation();

    this.isCartLoadingMap[albumId] = true;
    this.showCartCounter[albumId] = true; // Optimistic UI
    this.cartQuantities[albumId] = 1;

    this.cartService.addToCart(albumId, 1).subscribe({
      next: (response) => {
        this.isCartLoadingMap[albumId] = false;
        if (response.item) {
          this.cartItemIds[albumId] = response.item._id;
        }
      },
      error: () => {
        // Revert optimistic update
        this.isCartLoadingMap[albumId] = false;
        this.showCartCounter[albumId] = false;
      },
    });
  }

  /**
   * incrementCart
   * Increase quantity of item in cart
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  incrementCart(event: Event, albumId: string): void {
    event.stopPropagation();

    const album = this.remainingAlbums.find((a) => a._id === albumId);
    if (!album) return;

    const currentQty = this.cartQuantities[albumId] || 1;

    // Check stock limit
    if (this.isUpdatingCart[albumId] || currentQty >= album.stock) return;

    this.isUpdatingCart[albumId] = true;
    const newQuantity = currentQty + 1;
    const itemId = this.cartItemIds[albumId];

    if (itemId) {
      this.cartService.updateCartItem(itemId, newQuantity).subscribe({
        next: () => {
          this.cartQuantities[albumId] = newQuantity;
          this.isUpdatingCart[albumId] = false;
        },
        error: () => {
          this.isUpdatingCart[albumId] = false;
        },
      });
    }
  }

  /**
   * decrementCart
   * Remove item from cart completely
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  decrementCart(event: Event, albumId: string): void {
    event.stopPropagation();

    if (this.isUpdatingCart[albumId]) return;

    this.isUpdatingCart[albumId] = true;
    const itemId = this.cartItemIds[albumId];

    if (itemId) {
      this.cartService.removeFromCart(itemId).subscribe({
        next: () => {
          // Reset to add button state
          this.showCartCounter[albumId] = false;
          this.cartQuantities[albumId] = 1;
          delete this.cartItemIds[albumId];
          this.isUpdatingCart[albumId] = false;
        },
        error: () => {
          this.isUpdatingCart[albumId] = false;
        },
      });
    } else {
      // Fallback
      this.showCartCounter[albumId] = false;
      this.cartQuantities[albumId] = 1;
      this.isUpdatingCart[albumId] = false;
    }
  }

  /**
   * toggleWishlist
   * Add or remove album from wishlist
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
   * isInWishlist
   * Check if album is in user's wishlist
   * @param (string) albumId - Album ID
   * @return (boolean) True if in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistIds.has(albumId);
  }

  /**
   * getMainImageUrl
   * Get primary image URL with fallback
   * @param (Album) album - Album object
   * @return (string) Image URL
   */
  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  /**
   * formatPrice
   * Format price as currency string
   * @param (number) price - Price value
   * @return (string) Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * trackByAlbum
   * TrackBy function for ngFor optimization
   * @param (number) index - Item index
   * @param (Album) album - Album object
   * @return (string) Unique identifier
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}
