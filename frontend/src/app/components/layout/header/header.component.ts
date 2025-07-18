/**
 * Header Component
 * Displays the main navigation header with logo, search, and cart
 * Fully responsive with mobile menu
 */

import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "../../../services/auth.service";
import { CartService } from "../../../services/cart.service";
import { User } from "../../../models/user.model";
import { SearchBoxComponent } from "../../shared/search-box/search-box.component";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterModule, SearchBoxComponent],
  templateUrl: "./header.component.html",
  styleUrls: ["./header.component.css"],
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  cartItemCount: number = 0;
  isMenuOpen: boolean = false;
  isMobile: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if mobile on init
    this.checkIfMobile();

    // Subscribe to current user
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
      });

    // Subscribe to cart updates
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cartItemCount = cart.itemCount;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Listen for window resize
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    this.checkIfMobile();
    // Close mobile menu on resize to desktop
    if (!this.isMobile && this.isMenuOpen) {
      this.closeMenu();
    }
  }

  /**
   * Listen for escape key to close menu
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isMenuOpen) {
      this.closeMenu();
    }
  }

  /**
   * Check if mobile device
   */
  private checkIfMobile(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  /**
   * Toggle mobile menu
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Close mobile menu
   */
  closeMenu(): void {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.authService.logout();
    this.closeMenu();
  }

  /**
   * Navigate to route
   * @param route Route path
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMenu();
  }

  /**
   * Get user display name
   * @returns Display name or email
   */
  getUserDisplayName(): string {
    if (!this.currentUser) return '';
    return this.currentUser.firstName || this.currentUser.email.split('@')[0];
  }
}