/**
 * Header Component
 * Displays the main navigation header with logo, search, and cart
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
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
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
   * Toggle mobile menu
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Close mobile menu
   */
  closeMenu(): void {
    this.isMenuOpen = false;
  }

  /**
   * Handle logout
   */
  logout(): void {
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(['/']);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }
}