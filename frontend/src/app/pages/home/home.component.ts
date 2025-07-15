/**
 * Home Page Component
 * Displays the main landing page with featured and new albums
 */

import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subject, takeUntil } from "rxjs";
import { AlbumService } from "../../services/album.service";
import { Album } from "../../models/album.model";
import { environment } from "../../../environments/environment";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";
import { AlbumCardComponent } from "../../components/album/album-card/album-card.component";
import { SidebarComponent } from "../../components/layout/sidebar/sidebar.component";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    AlbumCardComponent,
    SidebarComponent,
  ],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"],
})
export class HomeComponent implements OnInit, OnDestroy {
  featuredAlbum: Album | null = null;
  topAlbums: Album[] = [];
  sideAlbums: Album[] = [];
  remainingAlbums: Album[] = [];
  additionalAlbums: Album[] = []; // Albums loaded on scroll
  allAlbumsLoaded = false;

  isLoading = true;
  isLoadingMore = false;
  hasMore = false;
  initialAlbumsDisplayed = false;

  private destroy$ = new Subject<void>();
  private loadedAlbumIds = new Set<string>(); // Track loaded album IDs to prevent duplicates

  constructor(private albumService: AlbumService) {}

  ngOnInit(): void {
    this.loadNewAlbums();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load new albums (23 albums)
   */
  private loadNewAlbums(): void {
    this.albumService
      .getNewAlbums()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (albums) => {
          this.processAlbums(albums);
          this.isLoading = false;
        },
        error: (error) => {
          console.error("Failed to load albums:", error);
          this.isLoading = false;
        },
      });
  }

  /**
   * Process and organize albums for display
   * @param albums Albums array (23 albums)
   */
  private processAlbums(albums: Album[]): void {
    // Set featured album (newest - index 0)
    if (albums.length > 0) {
      this.featuredAlbum = albums[0];
      this.loadedAlbumIds.add(albums[0]._id);
    }

    // Set top 8 albums (indices 1-8)
    if (albums.length > 1) {
      this.topAlbums = albums.slice(1, 9);
      this.topAlbums.forEach(album => this.loadedAlbumIds.add(album._id));
    }

    // Set side 2 albums (indices 9-10)
    if (albums.length > 9) {
      this.sideAlbums = albums.slice(9, 11);
      this.sideAlbums.forEach(album => this.loadedAlbumIds.add(album._id));
    }

    // Set remaining 12 albums (indices 11-22)
    if (albums.length > 11) {
      this.remainingAlbums = albums.slice(11, 23);
      this.remainingAlbums.forEach(album => this.loadedAlbumIds.add(album._id));
      this.initialAlbumsDisplayed = true;
    }

    // If we have less than 23 albums, we know there are no more to load
    if (albums.length < 23) {
      this.hasMore = false;
      this.allAlbumsLoaded = true;
    } else {
      // We have exactly 23, there might be more albums in the database
      // but don't enable loading yet - wait for scroll
      this.hasMore = false;
      this.allAlbumsLoaded = false;
    }
  }

  /**
   * Load more albums on scroll
   */
  private loadMoreAlbums(): void {
    if (this.isLoadingMore || !this.hasMore || !this.initialAlbumsDisplayed) {
      return;
    }

    this.isLoadingMore = true;

    // Start from page 2 since we already loaded 23 albums (which might be 2 pages)
    const pageToLoad = Math.floor((23 + this.additionalAlbums.length) / environment.itemsPerPage) + 1;
    
    this.albumService
      .getAlbums(pageToLoad, environment.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data.results.length > 0) {
            // Add all albums - they should be new since we're loading the correct page
            response.data.results.forEach(album => {
              // Double check we don't have duplicates
              if (!this.loadedAlbumIds.has(album._id)) {
                this.loadedAlbumIds.add(album._id);
                this.additionalAlbums.push(album);
              }
            });
            
            // Check if there are more albums
            this.hasMore = pageToLoad < response.data.pagination.pages;
          } else {
            this.hasMore = false;
            this.allAlbumsLoaded = true;
          }
          this.isLoadingMore = false;
        },
        error: (error) => {
          console.error("Failed to load more albums:", error);
          this.isLoadingMore = false;
          this.hasMore = false;
          this.allAlbumsLoaded = true;
        },
      });
  }

  /**
   * Listen for scroll events for infinite scrolling
   */
  @HostListener("window:scroll", ["$event"])
  onScroll(): void {
    if (this.shouldLoadMore()) {
      this.loadMoreAlbums();
    }
  }

  /**
   * Check if should load more albums
   * @returns true if should load more
   */
  private shouldLoadMore(): boolean {
    if (!this.initialAlbumsDisplayed || this.isLoadingMore) {
      return false;
    }

    // Enable loading more only after first scroll attempt
    if (!this.hasMore) {
      this.hasMore = true;
    }

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;
    const threshold = environment.infiniteScrollThreshold;

    return scrollPosition >= scrollHeight - threshold;
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