import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, switchMap } from "rxjs";
import { AlbumService } from "../../../services/album.service";
import { CartService } from "../../../services/cart.service";
import { WishlistService } from "../../../services/wishlist.service";
import { Album } from "../../../models/album.model";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-album-detail",
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SpinnerComponent],
  templateUrl: "./album-detail.component.html",
  styleUrls: ["./album-detail.component.css"],
})
export class AlbumDetailComponent implements OnInit, OnDestroy {
  album: Album | null = null;
  categoryName = '';
  isLoading = true;
  selectedImageUrl = '';
  quantity = 1;
  isAddingToCart = false;
  isInWishlist = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private cartService: CartService,
    private wishlistService: WishlistService
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const albumId = params['id'];
          return this.albumService.getAlbum(albumId);
        })
      )
      .subscribe({
        next: (album) => {
          this.album = album;
          this.selectedImageUrl = this.albumService.getMainImageUrl(album);
          this.categoryName = typeof album.category === 'object' ? album.category.name : '';
          this.isInWishlist = this.wishlistService.isInWishlist(album._id);
          this.isLoading = false;
        },
        error: (error) => {
          console.error("Failed to load album:", error);
          this.router.navigate(['/404']);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Select image to display
   */
  selectImage(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
  }

  /**
   * Get category ID for navigation
   */
  getCategoryId(): string {
    if (!this.album) return '';
    return typeof this.album.category === 'object' ? this.album.category._id : this.album.category;
  }

  /**
   * Increase quantity
   */
  increaseQuantity(): void {
    if (!this.album) return;
    if (this.quantity < this.album.stock) {
      this.quantity++;
    }
  }

  /**
   * Decrease quantity
   */
  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  /**
   * Validate quantity input
   */
  validateQuantity(): void {
    if (!this.album) return;
    
    if (this.quantity < 1) {
      this.quantity = 1;
    } else if (this.quantity > this.album.stock) {
      this.quantity = this.album.stock;
    }
  }

  /**
   * Add to cart
   */
  addToCart(): void {
    if (!this.album || this.isAddingToCart || !this.album.inStock) return;

    this.isAddingToCart = true;

    // Add multiple times based on quantity
    const addPromises = [];
    for (let i = 0; i < this.quantity; i++) {
      addPromises.push(this.cartService.addToCart(this.album._id).toPromise());
    }

    Promise.all(addPromises)
      .then(() => {
        this.isAddingToCart = false;
        // Reset quantity after adding
        this.quantity = 1;
        // Show success message (could use a toast service)
        console.log('Added to cart successfully');
      })
      .catch((error) => {
        console.error('Failed to add to cart:', error);
        this.isAddingToCart = false;
      });
  }

  /**
   * Toggle wishlist
   */
  toggleWishlist(): void {
    if (!this.album) return;

    if (this.isInWishlist) {
      this.wishlistService.removeFromWishlist(this.album._id).subscribe({
        next: () => {
          this.isInWishlist = false;
        },
        error: (error) => {
          console.error('Failed to remove from wishlist:', error);
        }
      });
    } else {
      this.wishlistService.addToWishlist(this.album._id).subscribe({
        next: () => {
          this.isInWishlist = true;
        },
        error: (error) => {
          console.error('Failed to add to wishlist:', error);
        }
      });
    }
  }

  /**
   * Get additional images (excluding main image)
   */
  getAdditionalImages(): string[] {
    if (!this.album || !this.album.images.length) return [];
    
    // If we have multiple images, return them
    if (this.album.images.length > 1) {
      return this.album.images.map(img => img.url);
    }
    
    // If only one image, create array with placeholders
    const mainImage = this.album.images[0].url;
    return [
      mainImage,
      '/assets/images/album-placeholder-2.jpg',
      '/assets/images/album-placeholder-3.jpg'
    ];
  }

  /**
   * Format price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }
}