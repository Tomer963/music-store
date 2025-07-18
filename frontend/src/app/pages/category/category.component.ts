/**
 * Category Page Component
 * Displays albums for a specific category
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Subject, takeUntil, switchMap } from "rxjs";
import { AlbumService } from "../../services/album.service";
import { CategoryService } from "../../services/category.service";
import { Album, Category } from "../../models/album.model";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";
import { AlbumCardComponent } from "../../components/album/album-card/album-card.component";
import { SidebarComponent } from "../../components/layout/sidebar/sidebar.component";

@Component({
  selector: "app-category",
  standalone: true,
  imports: [
    CommonModule,
    SpinnerComponent,
    AlbumCardComponent,
    SidebarComponent,
  ],
  templateUrl: "./category.component.html",
  styleUrls: ["./category.component.css"],
})
export class CategoryComponent implements OnInit, OnDestroy {
  category: Category | null = null;
  albums: Album[] = [];
  isLoading = true;
  categoryId: string = "";
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private albumService: AlbumService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    // Subscribe to route params and load category data
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          this.categoryId = params["id"];
          this.isLoading = true;
          return this.categoryService.getCategoryWithAlbums(this.categoryId);
        })
      )
      .subscribe({
        next: (response) => {
          this.category = { 
            _id: this.categoryId, 
            name: response.category,
            isActive: true 
          };
          this.albums = response.albums;
          this.isLoading = false;
        },
        error: (error) => {
          console.error("Failed to load category:", error);
          this.isLoading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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