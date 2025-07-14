/**
 * Sidebar Component
 * Displays categories and cart widget
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, NavigationEnd } from "@angular/router";
import { Subject, filter, takeUntil } from "rxjs";
import { CategoryService } from "../../../services/category.service";
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
  categories: Category[] = [];
  activeCategoryId: string | null = null;
  isLoadingCategories = true;
  showSidebar = true;
  private destroy$ = new Subject<void>();

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}

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
   * Load categories from service and sort alphabetically
   */
  private loadCategories(): void {
    this.categoryService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          // Sort categories alphabetically by name
          this.categories = categories.sort((a, b) => 
            a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
          );
          this.isLoadingCategories = false;
        },
        error: (error) => {
          console.error("Failed to load categories:", error);
          this.isLoadingCategories = false;
        },
      });
  }

  /**
   * Setup route change listener
   */
  private setupRouteListener(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkCurrentRoute();
      });
  }

  /**
   * Check current route and update sidebar visibility
   */
  private checkCurrentRoute(): void {
    const url = this.router.url;

    // Show sidebar only on home, category, and album pages
    this.showSidebar =
      url === "/" || url.includes("/category/") || url.includes("/album/");

    // Extract category ID from URL if on category page
    const categoryMatch = url.match(/\/category\/([a-f0-9]{24})/);
    this.activeCategoryId = categoryMatch ? categoryMatch[1] : null;
  }

  /**
   * Navigate to category page
   * @param categoryId Category ID
   */
  selectCategory(categoryId: string): void {
    this.activeCategoryId = categoryId;
    this.router.navigate(["/category", categoryId]);
  }

  /**
   * Check if category is active
   * @param categoryId Category ID
   * @returns true if active
   */
  isCategoryActive(categoryId: string): boolean {
    return this.activeCategoryId === categoryId;
  }
}