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

  private buildThumbnails(): AlbumImage[] {
    if (!this.album) return [];

    const thumbnails: AlbumImage[] = [];

    const mainImageUrl = this.albumService.getMainImageUrl(this.album);
    thumbnails.push({
      url: mainImageUrl,
      isMain: true,
    });

    if (this.album.images && this.album.images.length > 0) {
      const secondaryImages = this.album.images.filter((img) => !img.isMain);

      for (let i = 0; i < Math.min(2, secondaryImages.length); i++) {
        thumbnails.push({
          url: secondaryImages[i].url,
          isMain: false,
        });
      }

      if (thumbnails.length === 1 && this.album.images.length > 1) {
        for (let i = 1; i < Math.min(3, this.album.images.length); i++) {
          thumbnails.push({
            url: this.album.images[i].url,
            isMain: false,
          });
        }
      }
    }

    while (thumbnails.length < 3) {
      thumbnails.push({
        url: "/assets/images/album-placeholder.svg",
        isMain: false,
      });
    }

    return thumbnails;
  }

  selectImage(index: number): void {
    if (index >= 0 && index < this.thumbnails.length) {
      this.selectedImageIndex = index;
    }
  }

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

  getThreeThumbnails(): AlbumImage[] {
    return this.thumbnails;
  }

  addToCart(): void {
    if (!this.album || this.isAddingToCart || !this.album.inStock) return;

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

  toggleWishlist(): void {
    if (!this.album) return;

    this.wishlistService
      .toggleWishlist(this.album._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  isCategory(category: string | Category): category is Category {
    return typeof category === "object" && category !== null;
  }

  getCategoryId(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category._id
      : "";
  }

  getCategoryName(): string {
    return this.album && this.isCategory(this.album.category)
      ? this.album.category.name
      : "";
  }

  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

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