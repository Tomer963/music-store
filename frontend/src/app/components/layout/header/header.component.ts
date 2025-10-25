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
  cartItemCount = 0;
  isMenuOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => (this.currentUser = user));

    // Subscribe to cart changes
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cartItemCount = cart.items.reduce(
        (total, item) => total + item.quantity,
        0
      );
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle Menu
   *
   * Opens or closes mobile navigation menu
   *
   * @return void
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  /**
   * Close Menu
   *
   * Closes mobile navigation menu
   *
   * @return void
   */
  closeMenu(): void {
    this.isMenuOpen = false;
  }

  /**
   * Logout
   *
   * Logs out user and clears cart session
   *
   * @return void
   */
  logout(): void {
    this.cartService.clearSession();
    this.authService.logout();
    this.closeMenu();
    this.router.navigate(["/logout"]);
  }

  /**
   * Navigate To Checkout
   *
   * Navigates to checkout page
   *
   * @return void
   */
  navigateToCheckout(): void {
    this.router.navigate(["/checkout"]);
    this.closeMenu();
  }
}
