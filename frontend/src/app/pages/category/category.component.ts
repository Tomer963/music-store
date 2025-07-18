/**
 * Category Component
 * Displays albums for a specific category
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { AlbumService } from '../../services/album.service';
import { CategoryService } from '../../services/category.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';
import { Album, Category } from '../../models/album.model';
import { SpinnerComponent } from '../../components/shared/spinner/spinner.component';
import { AlbumCardComponent } from '../../components/album/album-card/album-card.component';
import { SidebarComponent } from '../../components/layout/sidebar/sidebar.component';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, AlbumCardComponent, SidebarComponent],
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.css']
})
export class CategoryComponent implements OnInit, OnDestroy {
  category: Category | null = null;
  albums: Album[] = [];
  isLoading = true;
  isAuthenticated = false;
  wishlistIds: string[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private albumService: AlbumService,
    private categoryService: CategoryService,
    private wishlistService: WishlistService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check authentication status
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isAuthenticated = !!user;
        if (this.isAuthenticated) {
          this.loadWishlist();
        }
      });

    // Subscribe to wishlist changes
    this.wishlistService.wishlist$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ids => {
        this.wishlistIds = ids;
      });

    // Load category and albums when route params change
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const categoryId = params['id'];
          this.isLoading = true;
          return this.categoryService.getCategoryWithAlbums(categoryId);
        })
      )
      .subscribe({
        next: (data) => {
          this.category = { _id: data.category, name: data.category } as Category;
          this.albums = data.albums;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load category:', error);
          this.isLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load user's wishlist
   */
  private loadWishlist(): void {
    this.wishlistService.getWishlist()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => console.error('Failed to load wishlist:', error)
      });
  }

  /**
   * Check if album is in wishlist
   * @param albumId Album ID
   * @returns true if in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistIds.includes(albumId);
  }

  /**
   * Toggle album in wishlist
   * @param albumId Album ID
   */
  toggleWishlist(albumId: string): void {
    if (!this.isAuthenticated) {
      // Redirect to login or show message
      console.log('Please login to add to wishlist');
      return;
    }

    if (this.isInWishlist(albumId)) {
      this.removeFromWishlist(albumId);
    } else {
      this.addToWishlist(albumId);
    }
  }

  /**
   * Add album to wishlist
   * @param albumId Album ID
   */
  private addToWishlist(albumId: string): void {
    console.log('Adding album to wishlist:', albumId);
    
    if (!albumId || albumId.length !== 24) {
      console.error('Invalid album ID:', albumId);
      return;
    }
    
    this.wishlistService.addToWishlist(albumId).subscribe({
      next: () => {
        console.log('Added to wishlist successfully');
      },
      error: (error) => {
        console.error('Failed to add to wishlist:', error);
      }
    });
  }

  /**
   * Remove album from wishlist
   * @param albumId Album ID
   */
  private removeFromWishlist(albumId: string): void {
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
   * Track by function for ngFor
   * @param index Item index
   * @param album Album object
   * @returns Unique identifier
   */
  trackByAlbum(index: number, album: Album): string {
    return album._id;
  }
}