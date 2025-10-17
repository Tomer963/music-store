import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router, NavigationEnd } from "@angular/router";
import { Subject, filter, takeUntil } from "rxjs";
import { SidebarComponent } from "../../layout/sidebar/sidebar.component";

@Component({
  selector: "app-content-layout",
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: "./content-layout.component.html",
  styleUrls: ["./content-layout.component.css"],
})
export class ContentLayoutComponent implements OnInit, OnDestroy {
  currentRoute = "";
  isAlbumPage = false;
  isCategoryPage = false;
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Listen to route changes to update page flags
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.checkCurrentRoute();
      });

    this.checkCurrentRoute();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check Current Route
   * Updates flags based on current URL for conditional rendering
   * @return void
   */
  private checkCurrentRoute(): void {
    const url = this.router.url;
    this.currentRoute = url;
    this.isAlbumPage = url.includes("/album/");
    this.isCategoryPage = url.includes("/category/");
  }
}
