import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { OrderService } from "../../services/order.service";
import { AlbumService } from "../../services/album.service";
import { User } from "../../models/user.model";
import { Order, OrderItem } from "../../models/order.model";
import { Album } from "../../models/album.model";
import { SpinnerComponent } from "../../components/shared/spinner/spinner.component";

@Component({
  selector: "app-my-account",
  standalone: true,
  imports: [CommonModule, RouterModule, SpinnerComponent],
  templateUrl: "./my-account.component.html",
  styleUrls: ["./my-account.component.css"],
})
export class MyAccountComponent implements OnInit, OnDestroy {
  user: User | null = null;
  orders: Order[] = [];
  isLoadingProfile = true;
  isLoadingOrders = true;
  activeTab: "profile" | "orders" = "orders"; // ✅ שונה מ-'profile' ל-'orders'
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private albumService: AlbumService
  ) {}

  /**
   * ngOnInit
   * Initialize component and load user data
   * @return void
   */
  ngOnInit(): void {
    this.loadUserProfile();
    this.loadOrders();
  }

  /**
   * ngOnDestroy
   * Cleanup subscriptions
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * loadUserProfile
   * Fetch user profile from API
   * @return void
   */
  private loadUserProfile(): void {
    this.authService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.user = user;
          this.isLoadingProfile = false;
        },
        error: () => (this.isLoadingProfile = false),
      });
  }

  /**
   * loadOrders
   * Fetch user orders and populate album details
   * @return void
   */
  private loadOrders(): void {
    this.orderService
      .getOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => this.processOrders(orders),
        error: () => (this.isLoadingOrders = false),
      });
  }

  /**
   * processOrders
   * Fetch album details for each order item
   * @param orders Array of orders
   * @return void
   */
  private processOrders(orders: Order[]): void {
    if (orders.length === 0) {
      this.orders = [];
      this.isLoadingOrders = false;
      return;
    }

    let processedCount = 0;

    orders.forEach((order) => {
      let itemsProcessed = 0;
      const totalItems = order.items.length;

      // Skip orders with no items
      if (totalItems === 0) {
        if (++processedCount === orders.length) {
          this.orders = orders;
          this.isLoadingOrders = false;
        }
        return;
      }

      // Fetch album details for each item
      order.items.forEach((item: OrderItem) => {
        if (typeof item.album === "string") {
          this.albumService.getAlbum(item.album).subscribe({
            next: (album) => {
              (item as any).album = album;
              if (
                ++itemsProcessed === totalItems &&
                ++processedCount === orders.length
              ) {
                this.orders = orders;
                this.isLoadingOrders = false;
              }
            },
            error: () => {
              // Fallback for failed album fetch
              (item as any).album = {
                _id: item.album as string,
                title: "Unknown Album",
                artist: "Unknown Artist",
              };
              if (
                ++itemsProcessed === totalItems &&
                ++processedCount === orders.length
              ) {
                this.orders = orders;
                this.isLoadingOrders = false;
              }
            },
          });
        } else if (
          ++itemsProcessed === totalItems &&
          ++processedCount === orders.length
        ) {
          this.orders = orders;
          this.isLoadingOrders = false;
        }
      });
    });
  }

  /**
   * switchTab
   * Switch between profile and orders tabs
   * @param tab Target tab
   * @return void
   */
  switchTab(tab: "profile" | "orders"): void {
    this.activeTab = tab;
  }

  /**
   * formatDate
   * Format date for display
   * @param date Date string
   * @return string Formatted date
   */
  formatDate(date: string | undefined): string {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * formatPrice
   * Format price as currency
   * @param price Price value
   * @return string Formatted price
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * getPaymentMethodText
   * Format payment method for display
   * @param method Payment method
   * @return string Formatted text
   */
  getPaymentMethodText(method: string): string {
    return method === "credit_card" ? "Credit Card" : "Check / Money Order";
  }

  /**
   * getTotalItems
   * Calculate total items in order
   * @param order Order object
   * @return number Total quantity
   */
  getTotalItems(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * isOrderExpandable
   * Check if order has items to display
   * @param order Order object
   * @return boolean True if expandable
   */
  isOrderExpandable(order: Order): boolean {
    return order.items.length > 0;
  }

  /**
   * toggleOrderDetails
   * Toggle order details section
   * @param orderId Order ID
   * @return void
   */
  toggleOrderDetails(orderId: string): void {
    const element = document.getElementById(`order-details-${orderId}`);
    element?.classList.toggle("show");
  }

  /**
   * getItemDisplayName
   * Format item name as "Artist - Title"
   * @param item Order item
   * @return string Formatted name
   */
  getItemDisplayName(item: OrderItem): string {
    if (typeof item.album === "object" && item.album !== null) {
      const album = item.album as Album;
      return `${album.artist} - ${album.title}`;
    }
    return "Unknown Album";
  }

  /**
   * getAlbumImage
   * Get album image URL with fallback to placeholder
   * @param item Order item
   * @return string Image URL
   */
  getAlbumImage(item: OrderItem): string {
    if (typeof item.album === "object" && item.album !== null) {
      const album = item.album as Album;
      return this.albumService.getMainImageUrl(album);
    }
    return "/assets/images/placeholder-svg-full.svg";
  }
}