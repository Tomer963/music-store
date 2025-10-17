import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AlbumService } from "../../../services/album.service";
import { CartService } from "../../../services/cart.service";
import { WishlistService } from "../../../services/wishlist.service";
import { Album, Category } from "../../../models/album.model";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";
import { ContentLayoutComponent } from "../../shared/content-layout/content-layout.component";

@Component({
  selector: "app-album-detail",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SpinnerComponent,
    ContentLayoutComponent,
  ],
  templateUrl: "./album-detail.component.html",
  styleUrls: ["./album-detail.component.css"],
})
export class AlbumDetailComponent implements OnInit, OnDestroy {
  album: Album | null = null;
  isLoading = true;
  isAddingToCart = false;
  quantity = 1;
  selectedImageIndex = 0;
  inWishlist = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {}

  /**
   * ngOnInit
   *
   * Initialize component and load album data from route params
   *
   * @return void
   */
  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const albumId = params["id"];
      if (albumId) this.loadAlbum(albumId);
    });
  }

  /**
   * ngOnDestroy
   *
   * Cleanup subscriptions on component destruction
   *
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * loadAlbum
   *
   * Load album data by ID and subscribe to wishlist status
   *
   * @param (string) albumId - Album ID to load
   * @return void
   */
  private loadAlbum(albumId: string): void {
    this.albumService
      .getAlbum(albumId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (album) => {
          this.album = album;
          this.isLoading = false;
          // Set initial quantity based on stock availability
          this.quantity = album.stock > 0 ? 1 : 0;
          this.subscribeToWishlistStatus();
        },
        error: () => {
          this.isLoading = false;
          this.router.navigate(["/404"]);
        },
      });
  }

  /**
   * subscribeToWishlistStatus
   *
   * Monitor wishlist status changes for current album
   *
   * @return void
   */
  private subscribeToWishlistStatus(): void {
    if (!this.album) return;

    this.wishlistService
      .isInWishlist(this.album._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inWishlist) => (this.inWishlist = inWishlist),
        error: () => (this.inWishlist = false),
      });
  }

  /**
   * selectImage
   *
   * Set selected thumbnail image index
   *
   * @param (number) index - Thumbnail index to select
   * @return void
   */
  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  /**
   * getSelectedImageUrl
   *
   * Get URL of currently selected image
   *
   * @return string - Selected image URL
   */
  getSelectedImageUrl(): string {
    if (!this.album) return "/assets/images/album-placeholder.svg";

    const thumbnails = this.getThreeThumbnails();
    if (thumbnails[this.selectedImageIndex]) {
      return thumbnails[this.selectedImageIndex].url;
    }

    return this.albumService.getMainImageUrl(this.album);
  }

  /**
   * addToCart
   *
   * Add album to cart with specified quantity
   *
   * @return void
   */
  addToCart(): void {
    if (!this.album || this.isAddingToCart || !this.album.inStock) return;

    // Validate quantity range
    if (this.quantity < 1 || this.quantity > this.album.stock) {
      this.quantity = 1;
      return;
    }

    this.isAddingToCart = true;
    this.cartService.addToCart(this.album._id, this.quantity).subscribe({
      next: () => {
        this.isAddingToCart = false;
        // Reset quantity after successful add
        this.quantity = this.album!.stock > 0 ? 1 : 0;
      },
      error: () => (this.isAddingToCart = false),
    });
  }

  /**
   * toggleWishlist
   *
   * Add or remove album from wishlist
   *
   * @return void
   */
  toggleWishlist(): void {
    if (!this.album) return;

    this.wishlistService
      .toggleWishlist(this.album._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  /**
   * isCategory
   *
   * Type guard to check if category is an object
   *
   * @param (string | Category) category - Category to check
   * @return boolean - True if category is object
   */
  isCategory(category: string | Category): category is Category {
    return typeof category === "object" && category !== null;
  }

  /**
   * getCategoryId
   *
   * Extract category ID for breadcrumb navigation
   *
   * @return string - Category ID or empty string
   */
  getCategoryId(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category._id
      : "";
  }

  /**
   * getCategoryName
   *
   * Extract category name for breadcrumb display
   *
   * @return string - Category name or empty string
   */
  getCategoryName(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category.name
      : "";
  }

  /**
   * formatPrice
   *
   * Format price for display
   *
   * @param (number) price - Price to format
   * @return string - Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * getFormattedDescription
   *
   * Split long description into paragraphs by double newlines
   *
   * @return string[] - Array of paragraphs
   */
  getFormattedDescription(): string[] {
    if (!this.album?.longDescription) {
      return ["No detailed description available."];
    }

    // Split by double newlines to create paragraphs
    const paragraphs = this.album.longDescription
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return paragraphs.length > 0
      ? paragraphs
      : ["No detailed description available."];
  }

  /**
   * getThreeThumbnails
   *
   * Get exactly 3 thumbnail images (main + secondary or placeholders)
   *
   * @return any[] - Array of 3 thumbnail objects
   */
  getThreeThumbnails(): any[] {
    if (!this.album) return [];

    const thumbnails = [];

    // Always add main image first
    thumbnails.push({
      url: this.albumService.getMainImageUrl(this.album),
      isMain: true,
    });

    // Add secondary images if available
    if (this.album.images && this.album.images.length > 0) {
      const secondaryImages = this.album.images.filter((img) => !img.isMain);

      // Add up to 2 secondary images
      for (let i = 0; i < Math.min(2, secondaryImages.length); i++) {
        thumbnails.push({
          url: secondaryImages[i].url,
          isMain: false,
        });
      }

      // Fallback: if only main image exists, use other images
      if (thumbnails.length === 1 && this.album.images.length > 1) {
        for (let i = 1; i < Math.min(3, this.album.images.length); i++) {
          thumbnails.push({
            url: this.album.images[i].url,
            isMain: false,
          });
        }
      }
    }

    // Fill remaining slots with placeholders
    while (thumbnails.length < 3) {
      thumbnails.push({
        url: "/assets/images/album-placeholder.svg",
        isMain: false,
      });
    }

    return thumbnails;
  }
}
