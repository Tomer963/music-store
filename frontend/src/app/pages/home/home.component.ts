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
  allAlbums: Album[] = [];

  isLoading = true;
  isLoadingMore = false;
  currentPage = 1;
  hasMore = true;

  private destroy$ = new Subject<void>();

  constructor(private albumService: AlbumService) {}

  ngOnInit(): void {
    this.loadNewAlbums();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load new albums
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
   * @param albums Albums array
   */
  private processAlbums(albums: Album[]): void {
    this.allAlbums = albums;

    // Set featured album (newest)
    if (albums.length > 0) {
      this.featuredAlbum = albums[0];
    }

    // Set top 8 albums (2-9)
    if (albums.length > 1) {
      this.topAlbums = albums.slice(1, 9);
    }

    // Set side albums (10-11)
    if (albums.length > 9) {
      this.sideAlbums = albums.slice(9, 11);
    }

    // Set remaining albums (12-23)
    if (albums.length > 11) {
      this.remainingAlbums = albums.slice(11, 23);
    }
  }

  /**
   * Load more albums on scroll
   */
  loadMoreAlbums(): void {
    if (this.isLoadingMore || !this.hasMore) {
      return;
    }

    this.isLoadingMore = true;
    this.currentPage++;

    this.albumService
      .getAlbums(this.currentPage, environment.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.remainingAlbums = [
            ...this.remainingAlbums,
            ...response.data.results,
          ];
          this.hasMore =
            response.data.pagination.page < response.data.pagination.pages;
          this.isLoadingMore = false;
        },
        error: (error) => {
          console.error("Failed to load more albums:", error);
          this.isLoadingMore = false;
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