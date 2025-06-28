/**
 * Search Box Component
 * Provides search functionality with autocomplete suggestions
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { FormControl } from "@angular/forms";
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  takeUntil} from "rxjs";
import { SearchService } from "../../../services/search.service";
import { Album } from "../../../models/album.model";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-search-box",
  templateUrl: "./search-box.component.html",
  styleUrls: ["./search-box.component.css"]})
export class SearchBoxComponent implements OnInit, OnDestroy {
  searchControl = new FormControl("");
  searchResults: Album[] = [];
  isSearching = false;
  showResults = false;
  private destroy$ = new Subject<void>();

  constructor(private searchService: SearchService, private router: Router) {}

  ngOnInit(): void {
    // Set up search with debounce
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(environment.searchDebounceTime),
        distinctUntilChanged(),
        filter((query) => query !== null && query.trim().length >= 3),
        switchMap((query) => {
          this.isSearching = true;
          return this.searchService.searchAlbums(query!);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearching = false;
          this.showResults = true;
        },
        error: (error) => {
          console.error("Search error:", error);
          this.isSearching = false;
          this.searchResults = [];
        }});

    // Hide results when search is cleared
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter((query) => !query || query.trim().length < 3)
      )
      .subscribe(() => {
        this.searchResults = [];
        this.showResults = false;
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
  onClickOutside(): void {
    this.hideResults();
  }

  /**
   * Format release year
   * @param album Album object
   * @returns Formatted string
   */
  formatAlbumInfo(album: Album): string {
    return `${album.title} / ${album.artist}, Released on ${album.releaseYear}`;
  }
}
