import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormControl } from "@angular/forms";
import { Router } from "@angular/router";
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
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
  searchQuery = "";
  private destroy$ = new Subject<void>();

  constructor(private searchService: SearchService, private router: Router) {}

  ngOnInit(): void {
    // Setup search with debounce to reduce API calls
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Wait 300ms after user stops typing
        distinctUntilChanged(), // Only trigger if value actually changed
        switchMap((query) => {
          const trimmedQuery = query?.trim() || "";
          this.searchQuery = trimmedQuery;

          // Require minimum 3 characters
          if (trimmedQuery.length < 3) {
            this.searchResults = [];
            this.showResults = false;
            this.isSearching = false;
            return of([]);
          }

          this.isSearching = true;
          this.showResults = true;
          return this.searchService.searchAlbums(trimmedQuery);
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.isSearching = false;
          this.showResults =
            this.searchResults.length > 0 || this.searchQuery.length >= 3;
        },
        error: (error) => {
          console.error("Search error:", error);
          this.isSearching = false;
          this.searchResults = [];
          this.showResults = this.searchQuery.length >= 3;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Clear Search
   * Resets search input and results
   * @return void
   */
  clearSearch(): void {
    this.searchControl.setValue("");
    this.searchResults = [];
    this.showResults = false;
    this.isSearching = false;
    this.searchQuery = "";
  }

  /**
   * On Search
   * Handle search form submission (enter key)
   * @return void
   */
  onSearch(): void {
    const query = this.searchControl.value?.trim();
    if (query && query.length >= 3) {
      this.hideResults();
      this.router.navigate(["/search"], { queryParams: { q: query } });
    }
  }

  /**
   * Select Album
   * Navigate to album detail page from search results
   * @param albumId Album ID
   * @return void
   */
  selectAlbum(albumId: string): void {
    this.hideResults();
    this.searchControl.setValue("");
    this.searchQuery = "";
    this.router.navigate(["/album", albumId]);
  }

  /**
   * Hide Results
   * Close search results dropdown
   * @return void
   */
  hideResults(): void {
    this.showResults = false;
  }

  /**
   * On Click Outside
   * Close dropdown when clicking outside search box
   * @param event Mouse click event
   * @return void
   */
  @HostListener("document:click", ["$event"])
  onClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".search-box")) {
      this.hideResults();
    }
  }
}
