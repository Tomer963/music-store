import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AlbumService } from "../../../services/album.service";
import { CartService } from "../../../services/cart.service";
import { WishlistService } from "../../../services/wishlist.service";
import { Album, Category, AlbumImage } from "../../../models/album.model";
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
  thumbnails: AlbumImage[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const albumId = params["id"];
      if (albumId) this.loadAlbum(albumId);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load Album
   *
   * Fetches album details from API and initializes component state
   *
   * @param albumId Album ID to load
   */
  private loadAlbum(albumId: string): void {
    this.albumService
      .getAlbum(albumId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (album) => {
          this.album = album;
          this.thumbnails = this.buildThumbnails();
          this.selectedImageIndex = 0;
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
   * Sets up subscription to track if album is in user's wishlist
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
   * Build Thumbnails
   *
   * Creates thumbnail array from album images with fallback placeholder
   *
   * @return Array of album images for thumbnail display
   */
  private buildThumbnails(): AlbumImage[] {
    if (!this.album) return [];

    const thumbnails: AlbumImage[] = [];
    const mainImageUrl = this.albumService.getMainImageUrl(this.album);

    // Add main image first
    thumbnails.push({ url: mainImageUrl, isMain: true });

    if (this.album.images && this.album.images.length > 0) {
      const secondaryImages = this.album.images.filter((img) => !img.isMain);

      // Add up to 2 secondary images
      for (let i = 0; i < Math.min(2, secondaryImages.length); i++) {
        thumbnails.push({ url: secondaryImages[i].url, isMain: false });
      }

      // Fallback if only main image exists
      if (thumbnails.length === 1 && this.album.images.length > 1) {
        for (let i = 1; i < Math.min(3, this.album.images.length); i++) {
          thumbnails.push({ url: this.album.images[i].url, isMain: false });
        }
      }
    }

    // Fill remaining slots with placeholder
    while (thumbnails.length < 3) {
      thumbnails.push({
        url: "/assets/images/album-placeholder.svg",
        isMain: false,
      });
    }

    return thumbnails;
  }

  /**
   * Select Image
   *
   * Changes the main displayed image
   *
   * @param index Index of thumbnail to display
   */
  selectImage(index: number): void {
    if (index >= 0 && index < this.thumbnails.length) {
      this.selectedImageIndex = index;
    }
  }

  /**
   * Get Selected Image URL
   *
   * Returns URL of currently selected image
   *
   * @return Image URL or placeholder
   */
  getSelectedImageUrl(): string {
    if (!this.album || this.thumbnails.length === 0) {
      return "/assets/images/album-placeholder.svg";
    }

    if (
      this.selectedImageIndex >= 0 &&
      this.selectedImageIndex < this.thumbnails.length
    ) {
      return this.thumbnails[this.selectedImageIndex].url;
    }

    return this.thumbnails[0].url;
  }

  /**
   * Get Three Thumbnails
   *
   * Returns the thumbnail array for display
   *
   * @return Array of three thumbnail images
   */
  getThreeThumbnails(): AlbumImage[] {
    return this.thumbnails;
  }

  /**
   * Add To Cart
   *
   * Adds the album to cart with selected quantity
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
   * Type guard to check if category is populated object
   *
   * @param category Category to check
   * @return True if category is object
   */
  isCategory(category: string | Category): category is Category {
    return typeof category === "object" && category !== null;
  }

  /**
   * Get Category ID
   *
   * Extracts category ID from album
   *
   * @return Category ID or empty string
   */
  getCategoryId(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category._id
      : "";
  }

  /**
   * Get Category Name
   *
   * Extracts category name from album
   *
   * @return Category name or empty string
   */
  getCategoryName(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category.name
      : "";
  }

  /**
   * Format Price
   *
   * Formats price with currency symbol
   *
   * @param price Price value
   * @return Formatted price string
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * Get Formatted Description
   *
   * Splits long description into paragraphs
   *
   * @return Array of description paragraphs
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
}
