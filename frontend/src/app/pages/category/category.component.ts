import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { Subject, takeUntil, switchMap, of } from "rxjs";
import { AlbumService } from "../../services/album.service";
import { CategoryService } from "../../services/category.service";
import { WishlistService } from "../../services/wishlist.service";
import { Album, Category, PaginatedResponse } from "../../models/album.model";
import { AlbumCardComponent } from "../../components/album/album-card/album-card.component";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";
import { SidebarComponent } from "../../components/layout/sidebar/sidebar.component";

@Component({
  selector: "app-category",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AlbumCardComponent,
    SpinnerComponent,
    SidebarComponent,
  ],
  templateUrl: "./category.component.html",
  styleUrls: ["./category.component.css"],
})
export class CategoryComponent implements OnInit, OnDestroy {
  category: Category | null = null;
  albums: Album[] = [];
  totalAlbums = 0;
  currentPage = 1;
  itemsPerPage = 12;
  isLoading = true;
  isLoadingMore = false;
  hasMore = true;
  categoryId = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private categoryService: CategoryService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit(): void {
    // Subscribe to route params and load category
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          this.categoryId = params['id'];
          this.resetData();
          
          // Temporary workaround - get all categories and find the one we need
          return this.categoryService.getCategories();
        })
      )
      .subscribe({
        next: (categories) => {
          const foundCategory = categories.find(c => c._id === this.categoryId);
          if (foundCategory) {
            this.category = foundCategory;
            this.loadAlbums();
          } else {
            console.error("Category not found");
            this.router.navigate(['/404']);
          }
        },
        error: (error) => {
          console.error("Failed to load category:", error);
          this.router.navigate(['/404']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Reset component data
   */
  private resetData(): void {
    this.albums = [];
    this.currentPage = 1;
    this.hasMore = true;
    this.isLoading = true;
  }

  /**
   * Load albums for the category
   */
  private loadAlbums(): void {
    if (!this.categoryId) return;

    // For now, let's get all albums and filter them
    this.albumService
      .getNewAlbums()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allAlbums) => {
          // Filter albums by category
          const filteredAlbums = allAlbums.filter(album => {
            if (typeof album.category === 'object') {
              return album.category._id === this.categoryId;
            }
            return album.category === this.categoryId;
          });
          
          // Simulate pagination
          const startIndex = (this.currentPage - 1) * this.itemsPerPage;
          const endIndex = startIndex + this.itemsPerPage;
          
          if (this.currentPage === 1) {
            this.albums = filteredAlbums.slice(startIndex, endIndex);
          } else {
            this.albums = [...this.albums, ...filteredAlbums.slice(startIndex, endIndex)];
          }
          
          this.totalAlbums = filteredAlbums.length;
          this.hasMore = endIndex < filteredAlbums.length;
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: (error: any) => {
          console.error("Failed to load albums:", error);
          this.isLoading = false;
          this.isLoadingMore = false;
        },
      });
  }

  /**
   * Load more albums
   */
  loadMoreAlbums(): void {
    if (this.isLoadingMore || !this.hasMore || this.isLoading) {
      return;
    }

    this.isLoadingMore = true;
    this.currentPage++;
    this.loadAlbums();
  }

  /**
   * Listen for scroll events
   */
  @HostListener("window:scroll", ["$event"])
  onScroll(): void {
    if (this.shouldLoadMore()) {
      this.loadMoreAlbums();
    }
  }

  /**
   * Check if should load more albums
   */
  private shouldLoadMore(): boolean {
    const scrollPosition = window.pageYOffset + window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;
    const threshold = 200; // pixels from bottom

    return scrollPosition >= scrollHeight - threshold;
  }

  /**
   * Add album to wishlist
   */
  addToWishlist(albumId: string): void {
    this.wishlistService.addToWishlist(albumId).subscribe({
      next: () => {
        console.log('Added to wishlist');
        // Show success message
      },
      error: (error) => {
        console.error('Failed to add to wishlist:', error);
      }
    });
  }

  /**
   * Remove album from wishlist
   */
  removeFromWishlist(albumId: string): void {
    this.wishlistService.removeFromWishlist(albumId).subscribe({
      next: () => {
        console.log('Removed from wishlist');
      },
      error: (error) => {
        console.error('Failed to remove from wishlist:', error);
      }
    });
  }

  /**
   * Check if album is in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistService.isInWishlist(albumId);
  }

  /**
   * Track by function for ngFor
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}