/**
 * Search Box Component
 * Provides search functionality with autocomplete suggestions
 */

import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormControl } from "@angular/forms";
import { Router } from "@angular/router";
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil,
  of,
} from "rxjs";
import { SearchService } from "../../../services/search.service";
import { Album } from "../../../models/album.model";
import { SpinnerComponent } from "../spinner/spinner.component";

@Component({
  selector: "app-search-box",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: "./search-box.component.html",
  styleUrls: ["./search-box.component.css"],
})
export class SearchBoxComponent implements OnInit, OnDestroy {
  searchControl = new FormControl("");
  searchResults: Album[] = [];
  isSearching = false;
  showResults = false;
  private destroy$ = new Subject<void>();

  constructor(private searchService: SearchService, private router: Router) {}

  ngOnInit(): void {
    console.log('SearchBox initialized');
    
    // Set up search with debounce
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Use direct value instead of environment
        distinctUntilChanged(),
        switchMap((query) => {
          console.log('Search query changed:', query);
          
          // Reset if query is too short
          if (!query || query.trim().length < 3) {
            this.searchResults = [];
            this.showResults = false;
            this.isSearching = false;
            return of([]);
          }
          
          // Start searching
          console.log('Starting search for:', query);
          this.isSearching = true;
          this.showResults = true;
          return this.searchService.searchAlbums(query);
        })
      )
      .subscribe({
        next: (results) => {
          console.log('Search results received:', results);
          this.searchResults = results;
          this.isSearching = false;
          // Keep showing results even if empty
          this.showResults = true;
        },
        error: (error) => {
          console.error("Search error:", error);
          this.isSearching = false;
          this.searchResults = [];
          this.showResults = true;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle search form submission
   */
  onSearch(): void {
    const query = this.searchControl.value?.trim();
    if (query && query.length >= 3) {
      this.hideResults();
      this.router.navigate(["/search"], { queryParams: { q: query } });
    }
  }

  /**
   * Navigate to album detail
   * @param albumId Album ID
   */
  selectAlbum(albumId: string): void {
    this.hideResults();
    this.searchControl.setValue("");
    this.router.navigate(["/album", albumId]);
  }

  /**
   * Hide search results
   */
  hideResults(): void {
    this.showResults = false;
  }

  /**
   * Handle click outside
   */
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const searchBox = target.closest(".search-box");
    if (!searchBox) {
      this.hideResults();
    }
  }

  /**
   * Get album image URL
   * @param album Album object
   * @returns Image URL
   */
  getAlbumImageUrl(album: Album): string {
    if (album.images && album.images.length > 0 && album.images[0].url) {
      return album.images[0].url;
    }
    return '/assets/images/album-placeholder.jpg';
  }

  /**
   * Format album info for display
   * @param album Album object
   * @returns Formatted string
   */
  formatAlbumInfo(album: Album): string {
    return `${album.title} / ${album.artist}, Released on ${album.releaseYear}`;
  }
}