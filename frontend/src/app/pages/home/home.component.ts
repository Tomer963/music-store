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
  // Album display groups for layout
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

  // Pagination configuration
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
   * NgOnInit
   * 
   * Initializes component and loads initial data
   * 
   * @return void
   */
  ngOnInit(): void {
    this.loadInitialAlbums();
    this.setupWishlistSubscription();
    this.setupCartSubscription();
    this.setupScrollListener();
  }

  /**
   * NgOnDestroy
   * 
   * Cleans up subscriptions to prevent memory leaks
   * 
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup Wishlist Subscription
   * 
   * Monitors wishlist changes and updates UI accordingly
   * 
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
   * Setup Cart Subscription
   * 
   * Monitors cart changes and updates quantity counters
   * 
   * @return void
   */
  private setupCartSubscription(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      // Reset all cart-related states
      this.showCartCounter = {};
      this.cartQuantities = {};
      this.cartItemIds = {};

      // Update states for each item in cart
      cart.items.forEach((item) => {
        const albumId = item.album._id;
        this.showCartCounter[albumId] = true;
        this.cartQuantities[albumId] = item.quantity;
        this.cartItemIds[albumId] = item._id;
      });
    });
  }

  /**
   * Setup Scroll Listener
   * 
   * Configures infinite scroll with debounce for performance
   * 
   * @return void
   */
  private setupScrollListener(): void {
    fromEvent(window, "scroll")
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(() => this.onScroll());
  }

  /**
   * On Window Scroll
   * 
   * HostListener backup for scroll detection
   * 
   * @return void
   */
  @HostListener("window:scroll", ["$event"])
  onWindowScroll(): void {
    this.onScroll();
  }

  /**
   * On Scroll
   * 
   * Checks scroll position and triggers next page load when near bottom
   * 
   * @return void
   */
  private onScroll(): void {
    if (this.isLoadingMore || !this.hasMore) return;

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Trigger load when within threshold of bottom
    if (scrollPosition >= documentHeight - this.scrollThreshold) {
      this.loadMoreAlbums();
    }
  }

  /**
   * Load Initial Albums
   * 
   * Fetches first page of albums and organizes them into layout groups
   * 
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
   * Load More Albums
   * 
   * Fetches next page for infinite scroll functionality
   * 
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
   * Process Initial Albums
   * 
   * Organizes first page albums into specific layout positions:
   * [0] = featured, [1-8] = top grid, [9-10] = sidebar, [11+] = main grid
   * 
   * @param (Album[]) albums Albums array to organize
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
   * Process Additional Albums
   * 
   * Appends newly loaded albums to the main grid
   * 
   * @param (Album[]) albums New albums from pagination
   * @return void
   */
  private processAdditionalAlbums(albums: Album[]): void {
    if (albums.length === 0) {
      this.hasMore = false;
      return;
    }

    this.allAlbums = [...this.allAlbums, ...albums];

    // If initial layout incomplete, reorganize all albums
    if (!this.featuredAlbum && albums.length > 0) {
      this.processInitialAlbums(this.allAlbums);
    } else {
      // Otherwise just append to remaining albums
      this.remainingAlbums = [...this.remainingAlbums, ...albums];
    }
  }

  /**
   * Update Pagination Info
   * 
   * Updates pagination state from API response
   * 
   * @param (any) pagination Pagination data from API
   * @return void
   */
  private updatePaginationInfo(pagination: any): void {
    this.totalPages = pagination.pages || 1;
    this.totalItems = pagination.total || 0;
    this.hasMore = this.currentPage < this.totalPages;
  }

  /**
   * View Album
   * 
   * Navigates to album detail page
   * 
   * @param (Event) event Click event
   * @param (string) albumId Album ID to view
   * @return void
   */
  viewAlbum(event: Event, albumId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(["/album", albumId]);
  }

  /**
   * Add To Cart
   * 
   * Adds album to cart with optimistic UI update
   * 
   * @param (Event) event Click event
   * @param (string) albumId Album ID to add
   * @return void
   */
  addToCart(event: Event, albumId: string): void {
    event.stopPropagation();

    this.isCartLoadingMap[albumId] = true;
    this.showCartCounter[albumId] = true; // Optimistic update
    this.cartQuantities[albumId] = 1;

    this.cartService.addToCart(albumId, 1).subscribe({
      next: (response) => {
        this.isCartLoadingMap[albumId] = false;
        if (response.item) {
          this.cartItemIds[albumId] = response.item._id;
        }
      },
      error: () => {
        // Revert optimistic update on error
        this.isCartLoadingMap[albumId] = false;
        this.showCartCounter[albumId] = false;
      },
    });
  }

  /**
   * Increment Cart
   * 
   * Increases album quantity in cart, respecting stock limit
   * 
   * @param (Event) event Click event
   * @param (string) albumId Album ID to increment
   * @return void
   */
  incrementCart(event: Event, albumId: string): void {
    event.stopPropagation();

    const album = this.remainingAlbums.find((a) => a._id === albumId);
    if (!album) return;

    const currentQty = this.cartQuantities[albumId] || 1;

    // Check if already at stock limit or currently updating
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
   * Decrement Cart
   * 
   * Removes album completely from cart (trash icon behavior)
   * 
   * @param (Event) event Click event
   * @param (string) albumId Album ID to remove
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
      // Fallback if no item ID found
      this.showCartCounter[albumId] = false;
      this.cartQuantities[albumId] = 1;
      this.isUpdatingCart[albumId] = false;
    }
  }

  /**
   * Toggle Wishlist
   * 
   * Adds or removes album from user's wishlist
   * 
   * @param (Event) event Click event
   * @param (string) albumId Album ID to toggle
   * @return void
   */
  toggleWishlist(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggleWishlist(albumId).subscribe();
  }

  /**
   * Is In Wishlist
   * 
   * Checks if album is in user's wishlist
   * 
   * @param (string) albumId Album ID to check
   * @return (boolean) True if album is in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistIds.has(albumId);
  }

  /**
   * Get Main Image URL
   * 
   * Gets primary album cover image URL with fallback
   * 
   * @param (Album) album Album object
   * @return (string) Image URL
   */
  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  /**
   * Format Price
   * 
   * Formats numeric price to currency string
   * 
   * @param (number) price Price value
   * @return (string) Formatted price string
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * Track By Album
   * 
   * TrackBy function for ngFor performance optimization
   * 
   * @param (number) index Item index in array
   * @param (Album) album Album object
   * @return (string) Unique identifier for tracking
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}