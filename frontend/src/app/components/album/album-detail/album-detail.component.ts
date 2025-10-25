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
   * Ng On Init
   * 
   * Loads album data from route params
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
   * Load Album
   * 
   * Fetches album data by ID
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
   * Subscribe To Wishlist Status
   * 
   * Monitors wishlist status changes
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
   * Select Image
   * 
   * Sets selected thumbnail image
   *
   * @param (number) index - Thumbnail index
   * @return void
   */
  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  /**
   * Get Selected Image URL
   * 
   * Gets URL of currently selected image
   *
   * @return string Selected image URL
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
   * Add To Cart
   * 
   * Adds album to cart with specified quantity
   *
   * @return void
   */
  addToCart(): void {
    if (!this.album || this.isAddingToCart || !this.album.inStock) return;

    // Validate quantity
    if (this.quantity < 1 || this.quantity > this.album.stock) {
      this.quantity = 1;
      return;
    }

    this.isAddingToCart = true;
    this.cartService.addToCart(this.album._id, this.quantity).subscribe({
      next: () => {
        this.isAddingToCart = false;
        this.quantity = this.album!.stock > 0 ? 1 : 0;
      },
      error: () => (this.isAddingToCart = false),
    });
  }

  /**
   * Toggle Wishlist
   * 
   * Adds or removes album from wishlist
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
   * Is Category
   * 
   * Type guard for category object
   *
   * @param (string | Category) category - Category to check
   * @return boolean True if category is object
   */
  isCategory(category: string | Category): category is Category {
    return typeof category === "object" && category !== null;
  }

  /**
   * Get Category ID
   * 
   * Extracts category ID for breadcrumb
   *
   * @return string Category ID or empty string
   */
  getCategoryId(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category._id
      : "";
  }

  /**
   * Get Category Name
   * 
   * Extracts category name for breadcrumb
   *
   * @return string Category name or empty string
   */
  getCategoryName(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category.name
      : "";
  }

  /**
   * Format Price
   * 
   * Formats price for display
   *
   * @param (number) price - Price to format
   * @return string Formatted price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * Get Formatted Description
   * 
   * Splits description into paragraphs
   *
   * @return string[] Array of paragraphs
   */
  getFormattedDescription(): string[] {
    if (!this.album?.longDescription) {
      return ["No detailed description available."];
    }

    const paragraphs = this.album.longDescription
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    return paragraphs.length > 0
      ? paragraphs
      : ["No detailed description available."];
  }

  /**
   * Get Three Thumbnails
   * 
   * Gets exactly 3 thumbnail images
   *
   * @return any[] Array of 3 thumbnail objects
   */
  getThreeThumbnails(): any[] {
    if (!this.album) return [];

    const thumbnails = [];

    // Add main image first
    thumbnails.push({
      url: this.albumService.getMainImageUrl(this.album),
      isMain: true,
    });

    // Add secondary images
    if (this.album.images && this.album.images.length > 0) {
      const secondaryImages = this.album.images.filter((img) => !img.isMain);

      for (let i = 0; i < Math.min(2, secondaryImages.length); i++) {
        thumbnails.push({
          url: secondaryImages[i].url,
          isMain: false,
        });
      }

      // Fallback to other images if needed
      if (thumbnails.length === 1 && this.album.images.length > 1) {
        for (let i = 1; i < Math.min(3, this.album.images.length); i++) {
          thumbnails.push({
            url: this.album.images[i].url,
            isMain: false,
          });
        }
      }
    }

    // Fill with placeholders
    while (thumbnails.length < 3) {
      thumbnails.push({
        url: "/assets/images/album-placeholder.svg",
        isMain: false,
      });
    }

    return thumbnails;
  }
}