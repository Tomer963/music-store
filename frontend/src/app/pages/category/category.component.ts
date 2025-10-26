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

  ngOnInit(): void {
    this.initializeWishlist();
    this.initializeRouteParams();
    this.subscribeToLoadingStates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeWishlist(): void {
    this.wishlistService.wishlistIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe((ids) => {
        this.wishlistIds = ids;
        this.cdr.markForCheck();
      });
  }

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

  private resetState(): void {
    this.error = null;
    this.albums = [];
    this.currentPage = 1;
    window.scrollTo(0, 0);
  }

  private loadCategoryData(): void {
    this.isLoading = true;

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

    this.loadAlbums();
  }

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

  private handleAlbumsError(): void {
    this.error = "Failed to load albums. Please try again.";
    this.isLoading = false;
    this.isLoadingMore = false;
    this.cdr.markForCheck();
  }

  @HostListener("window:scroll", ["$event"])
  onWindowScroll(): void {
    if (this.isLoadingMore || !this.hasMore || this.isLoading) return;

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - 300) {
      this.loadMoreAlbums();
    }
  }

  private loadMoreAlbums(): void {
    if (!this.hasMore || this.isLoadingMore) return;

    this.isLoadingMore = true;
    this.currentPage++;
    this.cdr.markForCheck();
    this.loadAlbums();
  }

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

  viewAlbum(event: Event, albumId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(["/album", albumId]);
  }

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

  addToWishlistLink(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggleWishlist(albumId).subscribe();
  }

  addToCompare(event: Event, albumId: string): void {
    event.preventDefault();
    event.stopPropagation();
  }

  isInWishlist(albumId: string): boolean {
    return this.wishlistIds.has(albumId);
  }

  getMainImageUrl(album: Album): string {
    return this.albumService.getMainImageUrl(album);
  }

  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

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

  goHome(): void {
    this.router.navigate(["/"]);
  }

  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }

  shouldShowEndMessage(): boolean {
    return !this.hasMore && !this.isLoadingMore && this.albums.length > 0;
  }
}