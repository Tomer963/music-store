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
   * ngOnInit
   * Initialize component and load category data
   * @return void
   */
  ngOnInit(): void {
    this.initializeWishlist();
    this.initializeRouteParams();
    this.subscribeToLoadingStates();
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
   * initializeWishlist
   * Setup wishlist subscriptions
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
   * subscribeToLoadingStates
   * Track loading states for wishlist operations
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
   * initializeRouteParams
   * Subscribe to route params and reload on category change
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
   * resetState
   * Reset component state for new category
   * @return void
   */
  private resetState(): void {
    this.error = null;
    this.albums = [];
    this.currentPage = 1;
    window.scrollTo(0, 0);
  }

  /**
   * loadCategoryData
   * Load category info and albums in parallel
   * @return void
   */
  private loadCategoryData(): void {
    this.isLoading = true;

    // Load category details
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
   * loadAlbums
   * Fetch albums for current page
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
   * handleAlbumsResponse
   * Process albums response and update state
   * @param response API response
   * @return void
   */
  private handleAlbumsResponse(response: any): void {
    const newAlbums = response.data?.results || [];
    const pagination = response.data?.pagination;

    // Append or replace albums based on page
    this.albums =
      this.currentPage === 1 ? newAlbums : [...this.albums, ...newAlbums];

    this.totalItems = pagination?.total || 0;
    this.hasMore = this.currentPage < (pagination?.pages || 1);
    this.isLoading = false;
    this.isLoadingMore = false;
    this.cdr.markForCheck();
  }

  /**
   * handleAlbumsError
   * Handle album loading errors
   * @return void
   */
  private handleAlbumsError(): void {
    this.error = "Failed to load albums. Please try again.";
    this.isLoading = false;
    this.isLoadingMore = false;
    this.cdr.markForCheck();
  }

  /**
   * onWindowScroll
   * Handle infinite scroll
   * @return void
   */
  @HostListener("window:scroll", ["$event"])
  onWindowScroll(): void {
    if (this.isLoadingMore || !this.hasMore || this.isLoading) return;

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Trigger load when within 300px of bottom
    if (scrollPosition >= documentHeight - 300) {
      this.loadMoreAlbums();
    }
  }

  /**
   * loadMoreAlbums
   * Load next page for infinite scroll
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
   * viewAlbum
   * Navigate to album detail
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
   * Add album to cart with loading state
   * @param event Click event
   * @param albumId Album ID
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
   * addToWishlistLink
   * Toggle wishlist via link
   * @param event Click event
   * @param albumId Album ID
   * @return void
   */
  addToWishlistLink(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggleWishlist(albumId).subscribe();
  }

  /**
   * addToCompare
   * Placeholder for compare feature (not implemented)
   * @param event Click event
   * @param albumId Album ID
   * @return void
   */
  addToCompare(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    // Feature not implemented
  }

  /**
   * isInWishlist
   * Check if album is in wishlist
   * @param albumId Album ID
   * @return boolean True if in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistIds.has(albumId);
  }

  /**
   * getMainImageUrl
   * Get primary image URL
   * @param album Album object
   * @return string Image URL
   */
  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  /**
   * formatPrice
   * Format price as currency
   * @param price Price value
   * @return string Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * getTruncatedDescription
   * FIXED: Smart truncation that respects word boundaries
   * Truncates to approximately 2 lines (~80-90 chars) and ensures no word breaking
   * @param description Full description text
   * @return string Truncated description with ellipsis if needed
   */
  getTruncatedDescription(description: string): string {
    if (!description) return "";
    
    // Approximate character limit for 2 lines (considering font size 0.813rem, line-height 1.4)
    // This is roughly 40-45 characters per line = ~85 chars total
    const maxLength = 85;
    
    // If description is shorter than limit, return as-is
    if (description.length <= maxLength) {
      return description;
    }
    
    // Find the last complete word before the limit
    let truncated = description.substring(0, maxLength);
    
    // Find the last space to avoid cutting mid-word
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 0) {
      // Cut at the last space and add ellipsis
      truncated = truncated.substring(0, lastSpace);
    }
    
    // Remove trailing punctuation before adding ellipsis
    truncated = truncated.replace(/[.,;:!?-]+$/, '');
    
    return truncated + '...';
  }

  /**
   * goHome
   * Navigate to home page
   * @return void
   */
  goHome(): void {
    this.router.navigate(["/"]);
  }

  /**
   * trackByAlbum
   * TrackBy function for performance
   * @param index Item index
   * @param album Album object
   * @return string Unique ID
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}