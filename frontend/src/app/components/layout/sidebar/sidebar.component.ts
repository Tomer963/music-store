import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, NavigationEnd } from "@angular/router";
import { Subject, filter, takeUntil } from "rxjs";
import { StateService } from "../../../services/state.service";
import { Category } from "../../../models/album.model";
import { CartWidgetComponent } from "../../cart/cart-widget/cart-widget.component";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, CartWidgetComponent, SpinnerComponent],
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.css"],
})
export class SidebarComponent implements OnInit, OnDestroy {
  categoriesWithAlbums: Category[] = [];
  activeCategoryId: string | null = null;
  currentAlbumCategoryId: string | null = null;
  isLoadingCategories = true;
  showCart = true;
  isInCategoryPage = false;
  isInAlbumPage = false;
  isInWishlistPage = false;
  private destroy$ = new Subject<void>();

  constructor(private stateService: StateService, private router: Router) {}

  ngOnInit(): void {
    this.loadCategories();
    this.setupRouteListener();
    this.checkCurrentRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load Categories
   * 
   * Loads categories with albums from state service
   *
   * @return void
   */
  private loadCategories(): void {
    this.isLoadingCategories = true;

    // Subscribe to state changes
    this.stateService
      .getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (state: any) => {
          if (state.categories) {
            this.categoriesWithAlbums = state.categories;
            this.isLoadingCategories = false;
          }
        },
        error: () => {
          this.isLoadingCategories = false;
          this.categoriesWithAlbums = [];
        },
      });

    // Check current state for immediate display
    const currentState = this.stateService.getCurrentState();
    if (currentState.categories?.length > 0) {
      this.categoriesWithAlbums = currentState.categories;
      this.isLoadingCategories = false;
    } else {
      // Load initial data if not available
      this.stateService.loadInitialData().subscribe({
        next: (state: any) => {
          this.categoriesWithAlbums = state.categories;
          this.isLoadingCategories = false;
        },
        error: () => (this.isLoadingCategories = false),
      });
    }
  }

  /**
   * Setup Route Listener
   * 
   * Monitors navigation events to update sidebar state
   *
   * @return void
   */
  private setupRouteListener(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.checkCurrentRoute());
  }

  /**
   * Check Current Route
   * 
   * Updates component state based on current route
   *
   * @return void
   */
  private checkCurrentRoute(): void {
    const url = this.router.url;

    // Hide cart only on home page
    this.showCart = url !== "/" && !url.startsWith("/?");

    // Detect page type for conditional styling
    this.isInCategoryPage = url.includes("/category/");
    this.isInAlbumPage = url.includes("/album/");
    this.isInWishlistPage = url.includes("/wishlist");

    // Extract active category ID from URL
    const categoryMatch = url.match(/\/category\/([a-f0-9]{24})/);
    this.activeCategoryId = categoryMatch ? categoryMatch[1] : null;

    // Get album's category for sidebar highlighting
    if (this.isInAlbumPage) {
      const albumMatch = url.match(/\/album\/([a-f0-9]{24})/);
      if (albumMatch) {
        this.getAlbumCategory(albumMatch[1]);
      }
    } else {
      this.currentAlbumCategoryId = null;
    }
  }

  /**
   * Get Album Category
   * 
   * Fetches album's category for highlighting in sidebar
   *
   * @param (string) albumId - Album identifier
   * @return void
   */
  private getAlbumCategory(albumId: string): void {
    const state = this.stateService.getCurrentState();
    const album = state.albums.find((a) => a._id === albumId);

    if (album) {
      this.currentAlbumCategoryId =
        typeof album.category === "string"
          ? album.category
          : album.category?._id || null;
    }
  }

  /**
   * Select Category
   * 
   * Navigates to category page
   *
   * @param (string) categoryId - Category identifier
   * @return void
   */
  selectCategory(categoryId: string): void {
    this.router.navigate(["/category", categoryId]);
  }

  /**
   * Is Category Active
   * 
   * Checks if category is currently active
   *
   * @param (string) categoryId - Category identifier
   * @return boolean True if category is active
   */
  isCategoryActive(categoryId: string): boolean {
    return (
      this.activeCategoryId === categoryId ||
      this.currentAlbumCategoryId === categoryId
    );
  }

  /**
   * Get Sidebar Classes
   * 
   * Returns CSS classes based on current page
   *
   * @return string Space-separated CSS class names
   */
  getSidebarClasses(): string {
    const classes = [];
    if (this.isInCategoryPage) classes.push("in-category-page");
    if (this.isInAlbumPage) classes.push("in-album-page");
    if (this.isInWishlistPage) classes.push("in-wishlist-page");
    return classes.join(" ");
  }
}