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
   * Initializes component and loads user data
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
   * LoadUserProfile
   * 
   * Fetches user profile from API
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
   * LoadOrders
   * 
   * Fetches user orders with album details
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
   * ProcessOrders
   * 
   * Fetches album details for each order item and enriches order data
   *
   * @param (Order[]) orders - Array of orders
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
        // Check if album is stored as ID string
        if (typeof item.album === "string") {
          this.albumService.getAlbum(item.album).subscribe({
            next: (album) => {
              // Replace ID with full album object
              (item as any).album = album;
              if (++itemsProcessed === totalItems && ++processedCount === orders.length) {
                this.orders = orders;
                this.isLoadingOrders = false;
              }
            },
            error: () => {
              // Fallback for failed fetch
              (item as any).album = {
                _id: item.album as string,
                title: "Unknown Album",
                artist: "Unknown Artist",
              };
              if (++itemsProcessed === totalItems && ++processedCount === orders.length) {
                this.orders = orders;
                this.isLoadingOrders = false;
              }
            },
          });
        } else if (++itemsProcessed === totalItems && ++processedCount === orders.length) {
          // Album already populated
          this.orders = orders;
          this.isLoadingOrders = false;
        }
      });
    });
  }

  /**
   * SwitchTab
   * 
   * Switches between profile and orders tabs
   *
   * @param ("profile" | "orders") tab - Target tab
   * @return void
   */
  switchTab(tab: "profile" | "orders"): void {
    this.activeTab = tab;
  }

  /**
   * FormatDate
   * 
   * Formats date for display
   *
   * @param (string | undefined) date - Date string
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
   * FormatPrice
   * 
   * Formats price as currency
   *
   * @param (number) price - Price value
   * @return string Formatted price
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * GetPaymentMethodText
   * 
   * Formats payment method for display
   *
   * @param (string) method - Payment method
   * @return string Formatted text
   */
  getPaymentMethodText(method: string): string {
    return method === "credit_card" ? "Credit Card" : "Check / Money Order";
  }

  /**
   * GetTotalItems
   * 
   * Calculates total items in order
   *
   * @param (Order) order - Order object
   * @return number Total quantity
   */
  getTotalItems(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * IsOrderExpandable
   * 
   * Checks if order has items to display
   *
   * @param (Order) order - Order object
   * @return boolean True if expandable
   */
  isOrderExpandable(order: Order): boolean {
    return order.items.length > 0;
  }

  /**
   * ToggleOrderDetails
   * 
   * Toggles order details visibility
   *
   * @param (string) orderId - Order ID
   * @return void
   */
  toggleOrderDetails(orderId: string): void {
    const element = document.getElementById(`order-details-${orderId}`);
    element?.classList.toggle("show");
  }

  /**
   * GetItemDisplayName
   * 
   * Formats item name as "Artist - Title"
   *
   * @param (OrderItem) item - Order item
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
   * GetAlbumImage
   * 
   * Gets album image URL with fallback
   *
   * @param (OrderItem) item - Order item
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