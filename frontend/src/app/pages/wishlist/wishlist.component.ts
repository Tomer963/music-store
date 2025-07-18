/**
 * Wishlist Page Component
 * Displays user's favorite albums
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { WishlistService } from "../../services/wishlist.service";
import { AuthService } from "../../services/auth.service";
import { AlbumService } from "../../services/album.service";
import { Album } from "../../models/album.model";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";
import { AlbumCardComponent } from "../../components/album/album-card/album-card.component";
import { SidebarComponent } from "../../components/layout/sidebar/sidebar.component";

@Component({
  selector: "app-wishlist",
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    AlbumCardComponent,
    SidebarComponent,
  ],
  templateUrl: "./wishlist.component.html",
  styleUrls: ["./wishlist.component.css"],
})
export class WishlistComponent implements OnInit, OnDestroy {
  wishlistAlbums: Album[] = [];
  isLoading = true;
  isLoggedIn = false;
  private destroy$ = new Subject<void>();

  constructor(
    private wishlistService: WishlistService,
    private authService: AuthService,
    private albumService: AlbumService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check authentication status
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isLoggedIn = !!user;
        if (this.isLoggedIn) {
          this.loadWishlist();
        } else {
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load wishlist albums
   */
  private loadWishlist(): void {
    this.wishlistService
      .getWishlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (albums) => {
          this.wishlistAlbums = albums;
          this.isLoading = false;
        },
        error: (error) => {
          console.error("Failed to load wishlist:", error);
          this.isLoading = false;
        },
      });
  }

  /**
   * Remove album from wishlist
   * @param albumId Album ID to remove
   */
  removeFromWishlist(albumId: string): void {
    this.wishlistService.removeFromWishlist(albumId).subscribe({
      next: () => {
        // Remove from local array
        this.wishlistAlbums = this.wishlistAlbums.filter(
          (album) => album._id !== albumId
        );
      },
      error: (error) => {
        console.error("Failed to remove from wishlist:", error);
      },
    });
  }

  /**
   * Navigate to album detail
   * @param albumId Album ID
   */
  viewAlbum(albumId: string): void {
    this.router.navigate(["/album", albumId]);
  }

  /**
   * Navigate to login
   */
  goToLogin(): void {
    this.router.navigate(["/login"], {
      queryParams: { returnUrl: "/wishlist" },
    });
  }

  /**
   * Track by function for ngFor
   * @param index Item index
   * @param album Album object
   * @returns Unique identifier
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}