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
  activeTab: "profile" | "orders" = "orders";
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private albumService: AlbumService
  ) {}

  /**
   * NgOnInit
   *
   * Initializes component and loads user profile and order data
   *
   * @return void
   */
  ngOnInit(): void {
    this.loadUserProfile();
    this.loadOrders();
  }

  /**
   * NgOnDestroy
   *
   * Cleans up subscriptions to prevent memory leaks
   *
   * @return void
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load User Profile
   *
   * Fetches current user profile data from API
   *
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
   * Load Orders
   *
   * Fetches user orders and enriches them with album details
   *
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
   * Process Orders
   *
   * Fetches full album details for each order item to replace album IDs with complete data
   *
   * @param (Order[]) orders Array of orders to process
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

      // Handle orders with no items
      if (totalItems === 0) {
        if (++processedCount === orders.length) {
          this.orders = orders;
          this.isLoadingOrders = false;
        }
        return;
      }

      // Fetch album details for each item
      order.items.forEach((item: OrderItem) => {
        // Check if album is stored as ID string instead of full object
        if (typeof item.album === "string") {
          this.albumService.getAlbum(item.album).subscribe({
            next: (album) => {
              // Replace ID with full album object
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
          // Album already populated as full object
          this.orders = orders;
          this.isLoadingOrders = false;
        }
      });
    });
  }

  /**
   * Switch Tab
   *
   * Switches between profile and orders tabs
   *
   * @param ("profile" | "orders") tab Target tab to display
   * @return void
   */
  switchTab(tab: "profile" | "orders"): void {
    this.activeTab = tab;
  }

  /**
   * Format Date
   *
   * Formats ISO date string to readable format
   *
   * @param (string | undefined) date ISO date string
   * @return (string) Formatted date string or "N/A"
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
   * Format Price
   *
   * Formats numeric price to currency string
   *
   * @param (number) price Price value to format
   * @return (string) Formatted price string with dollar sign
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * Get Payment Method Text
   *
   * Converts payment method code to readable text
   *
   * @param (string) method Payment method code
   * @return (string) Human-readable payment method text
   */
  getPaymentMethodText(method: string): string {
    return method === "credit_card" ? "Credit Card" : "Check / Money Order";
  }

  /**
   * Get Total Items
   *
   * Calculates total quantity of items in order
   *
   * @param (Order) order Order object
   * @return (number) Total quantity of all items
   */
  getTotalItems(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Is Order Expandable
   *
   * Checks if order has items that can be displayed
   *
   * @param (Order) order Order object to check
   * @return (boolean) True if order has items
   */
  isOrderExpandable(order: Order): boolean {
    return order.items.length > 0;
  }

  /**
   * Toggle Order Details
   *
   * Expands or collapses order details section
   *
   * @param (string) orderId Order ID to toggle
   * @return void
   */
  toggleOrderDetails(orderId: string): void {
    const element = document.getElementById(`order-details-${orderId}`);
    element?.classList.toggle("show");
  }

  /**
   * Get Item Display Name
   *
   * Formats order item name as "Artist - Title"
   *
   * @param (OrderItem) item Order item object
   * @return (string) Formatted display name
   */
  getItemDisplayName(item: OrderItem): string {
    if (typeof item.album === "object" && item.album !== null) {
      const album = item.album as Album;
      return `${album.artist} - ${album.title}`;
    }
    return "Unknown Album";
  }

  /**
   * Get Album Image
   *
   * Retrieves album cover image URL with fallback to placeholder
   *
   * @param (OrderItem) item Order item object
   * @return (string) Image URL
   */
  getAlbumImage(item: OrderItem): string {
    if (typeof item.album === "object" && item.album !== null) {
      const album = item.album as Album;
      return this.albumService.getMainImageUrl(album);
    }
    return "/assets/images/placeholder-svg-full.svg";
  }
}
