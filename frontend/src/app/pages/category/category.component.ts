import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AlbumService } from "../../services/album.service";
import { CartService } from "../../services/cart.service";
import { WishlistService } from "../../services/wishlist.service";
import { CategoryService } from "../../services/category.service";
import { Category, Album } from "../../models/album.model";
import { ContentLayoutComponent } from "../../components/shared/content-layout/content-layout.component";

@Component({
  selector: "app-category",
  standalone: true,
  imports: [CommonModule, RouterModule, ContentLayoutComponent],
  templateUrl: "./category.component.html",
  styleUrls: ["./category.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent implements OnInit, OnDestroy {
  category: Category | null = null;
  albums: Album[] = [];
  isLoading = true;
  isLoadingMore = false;
  hasMore = true;
  error: string | null = null;
  totalItems = 0;
  currentPage = 1;
  categoryId = "";

  private destroy$ = new Subject<void>();
  private wishlistIds = new Set<string>();
  wishlistLoadingMap: { [key: string]: boolean } = {};
  cartLoadingMap: { [key: string]: boolean } = {};

  private readonly ITEMS_PER_PAGE = 12;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * NgOnInit
   *
   * Initialize component and load category data
   *
   * @return void
   */
  ngOnInit(): void {
    this.initializeWishlist();
    this.initializeRouteParams();
    this.subscribeToLoadingStates();
  }

  /**
   * NgOnDestroy
   *
   * Cleanup subscriptions
   *
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * InitializeWishlist
   *
   * Subscribe to wishlist changes
   *
   * @return void
   */
  private initializeWishlist(): void {
    this.wishlistService.wishlistIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ids) => {
        this.wishlistIds = ids;
        this.cdr.markForCheck();
      });
  }

  /**
   * SubscribeToLoadingStates
   *
   * Subscribe to wishlist loading states
   *
   * @return void
   */
  private subscribeToLoadingStates(): void {
    this.wishlistService.itemLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loadingStates) => {
        loadingStates.forEach((isLoading, albumId) => {
          this.wishlistLoadingMap[albumId] = isLoading;
        });
        this.cdr.markForCheck();
      });
  }

  /**
   * InitializeRouteParams
   *
   * Subscribe to route params and load category
   *
   * @return void
   */
  private initializeRouteParams(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.categoryId = params["id"];
      if (!this.categoryId) {
        this.router.navigate(["/404"]);
        return;
      }

      this.resetState();
      this.loadCategoryData();
    });
  }

  /**
   * ResetState
   *
   * Reset component state for new category
   *
   * @return void
   */
  private resetState(): void {
    this.error = null;
    this.albums = [];
    this.currentPage = 1;
    window.scrollTo(0, 0);
  }

  /**
   * LoadCategoryData
   *
   * Load category info and albums
   *
   * @return void
   */
  private loadCategoryData(): void {
    this.isLoading = true;

    // Load category info
    this.categoryService
      .getCategory(this.categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (category) => {
          this.category = category;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = "Failed to load category";
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

    // Load albums
    this.loadAlbums();
  }

  /**
   * LoadAlbums
   *
   * Load albums for current page
   *
   * @return void
   */
  private loadAlbums(): void {
    this.albumService
      .getAlbumsByCategory(
        this.categoryId,
        this.currentPage,
        this.ITEMS_PER_PAGE
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => this.handleAlbumsResponse(response),
        error: () => this.handleAlbumsError(),
      });
  }

  /**
   * HandleAlbumsResponse
   *
   * Process albums API response
   *
   * @param (any) response - API response
   * @return void
   */
  private handleAlbumsResponse(response: any): void {
    const newAlbums = response.data?.results || [];
    const pagination = response.data?.pagination;

    this.albums =
      this.currentPage === 1 ? newAlbums : [...this.albums, ...newAlbums];

    this.totalItems = pagination?.total || 0;
    this.hasMore = this.currentPage < (pagination?.pages || 1);
    this.isLoading = false;
    this.isLoadingMore = false;
    this.cdr.markForCheck();
  }

  /**
   * HandleAlbumsError
   *
   * Handle albums loading error
   *
   * @return void
   */
  private handleAlbumsError(): void {
    this.error = "Failed to load albums. Please try again.";
    this.isLoading = false;
    this.isLoadingMore = false;
    this.cdr.markForCheck();
  }

  /**
   * OnWindowScroll
   *
   * Handle window scroll for infinite loading
   *
   * @return void
   */
  @HostListener("window:scroll", ["$event"])
  onWindowScroll(): void {
    if (this.isLoadingMore || !this.hasMore || this.isLoading) return;

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Trigger load when near bottom
    if (scrollPosition >= documentHeight - 300) {
      this.loadMoreAlbums();
    }
  }

  /**
   * LoadMoreAlbums
   *
   * Load next page of albums
   *
   * @return void
   */
  private loadMoreAlbums(): void {
    if (!this.hasMore || this.isLoadingMore) return;

    this.isLoadingMore = true;
    this.currentPage++;
    this.cdr.markForCheck();
    this.loadAlbums();
  }

  /**
   * ViewAlbumFromCard
   *
   * Navigate to album detail when clicking card
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  viewAlbumFromCard(event: Event, albumId: string): void {
    const target = event.target as HTMLElement;
    if (
      target.closest(".album-icon-btn") ||
      target.closest(".action-link") ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }

    this.router.navigate(["/album", albumId]);
  }

  /**
   * ViewAlbum
   *
   * Navigate to album detail page
   *
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
   * AddToCart
   *
   * Add album to cart
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  addToCart(event: Event, albumId: string): void {
    event.stopPropagation();
    event.preventDefault();

    const album = this.albums.find((a) => a._id === albumId);
    if (!album?.inStock) return;

    this.cartLoadingMap[albumId] = true;
    this.cdr.markForCheck();

    this.cartService.addToCart(albumId, 1).subscribe({
      next: () => {
        this.cartLoadingMap[albumId] = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.cartLoadingMap[albumId] = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * AddToWishlistLink
   *
   * Toggle album in wishlist
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  addToWishlistLink(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggleWishlist(albumId).subscribe();
  }

  /**
   * AddToCompare
   *
   * Add album to compare (placeholder)
   *
   * @param (Event) event - Click event
   * @param (string) albumId - Album ID
   * @return void
   */
  addToCompare(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    // Compare functionality placeholder
  }

  /**
   * IsInWishlist
   *
   * Check if album is in wishlist
   *
   * @param (string) albumId - Album ID
   * @return boolean - True if in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistIds.has(albumId);
  }

  /**
   * GetMainImageUrl
   *
   * Get album main image URL
   *
   * @param (Album) album - Album object
   * @return string - Image URL
   */
  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  /**
   * FormatPrice
   *
   * Format price as currency
   *
   * @param (number) price - Price value
   * @return string - Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * GetTruncatedDescription
   *
   * Truncate description with word boundary respect
   *
   * @param (string) description - Full description
   * @return string - Truncated description
   */
  getTruncatedDescription(description: string): string {
    if (!description) return "";

    const maxLength = 85;

    if (description.length <= maxLength) {
      return description;
    }

    let truncated = description.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }

    truncated = truncated.replace(/[.,;:!?-]+$/, "");

    return truncated + "...";
  }

  /**
   * GoHome
   *
   * Navigate to home page
   *
   * @return void
   */
  goHome(): void {
    this.router.navigate(["/"]);
  }

  /**
   * TrackByAlbum
   *
   * TrackBy function for performance
   *
   * @param (number) index - Item index
   * @param (Album) album - Album object
   * @return string - Unique identifier
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }

  /**
   * ShouldShowEndMessage
   *
   * Check if should show end message
   *
   * @return boolean - True if should show
   */
  shouldShowEndMessage(): boolean {
    return !this.hasMore && !this.isLoadingMore && this.albums.length > 0;
  }
}
