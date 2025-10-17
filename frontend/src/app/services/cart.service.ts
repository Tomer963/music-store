import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { BehaviorSubject, Observable, throwError, of } from "rxjs";
import { tap, catchError, map } from "rxjs/operators";
import { environment } from "../../environments/environment";
import {
  Cart,
  CartItem,
  AddToCartRequest,
  UpdateCartItemRequest,
  CartResponse,
} from "../models/cart.model";
import { ApiResponse } from "../models/album.model";
import { AuthService } from "./auth.service";

@Injectable({
  providedIn: "root",
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cart`;
  private cartSubject = new BehaviorSubject<Cart>({
    items: [],
    itemCount: 0,
    total: 0,
  });
  public cart$ = this.cartSubject.asObservable();
  private sessionId: string | null = null;

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Initialize Cart
   * Called on app startup to restore cart from session or user account
   * @return void
   */
  initializeCart(): void {
    this.sessionId = this.getOrCreateSessionId();
    this.loadCart();
  }

  /**
   * Refresh Cart
   * Reloads cart from server and merges guest cart with user cart after login
   * CRITICAL: Sends sessionId even when authenticated to enable cart merge
   * @return Observable<Cart> Refreshed cart data
   */
  refreshCart(): Observable<Cart> {
    const isAuth = this.authService.isAuthenticated();

    return this.getCart().pipe(
      tap((cart) => {
        this.cartSubject.next(cart);

        // Clear sessionId AFTER successful merge (only for authenticated users)
        if (isAuth && this.sessionId) {
          this.sessionId = null;
          localStorage.removeItem(environment.sessionIdKey);
        }
      })
    );
  }

  /**
   * Get Cart
   * Fetch current cart from server
   * @return Observable<Cart> Cart data
   */
  getCart(): Observable<Cart> {
    return this.http
      .get<ApiResponse<Cart>>(this.apiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => {
          const cart = response.data || { items: [], itemCount: 0, total: 0 };
          return cart;
        }),
        catchError((error) => {
          console.error("Error getting cart:", error);
          return of({ items: [], itemCount: 0, total: 0 });
        })
      );
  }

  /**
   * Add To Cart
   * Adds an item to cart or increases quantity if already exists
   * @param albumId Album ID to add
   * @param quantity Quantity to add (default 1)
   * @return Observable<CartResponse> Cart response with item and sessionId
   */
  addToCart(albumId: string, quantity = 1): Observable<CartResponse> {
    const request: AddToCartRequest = { albumId, quantity };

    return this.http
      .post<ApiResponse<CartResponse>>(`${this.apiUrl}/items`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data!),
        tap((response) => {
          // Store sessionId for guest users
          if (response.sessionId && !this.authService.isAuthenticated()) {
            this.setSessionId(response.sessionId);
          }

          this.loadCart();
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Update Cart Item
   * Updates quantity of existing cart item
   * @param itemId Cart item ID
   * @param quantity New quantity
   * @return Observable<CartItem> Updated cart item
   */
  updateCartItem(itemId: string, quantity: number): Observable<CartItem> {
    const request: UpdateCartItemRequest = { quantity };

    return this.http
      .put<ApiResponse<CartItem>>(`${this.apiUrl}/items/${itemId}`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data!),
        tap(() => this.loadCart()),
        catchError(this.handleError)
      );
  }

  /**
   * Remove From Cart
   * Removes an item completely from cart
   * @param itemId Cart item ID
   * @return Observable<void> Void observable
   */
  removeFromCart(itemId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/items/${itemId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map(() => undefined),
        tap(() => this.loadCart()),
        catchError(this.handleError)
      );
  }

  /**
   * Clear Cart
   * Removes all items from cart
   * @return Observable<void> Void observable
   */
  clearCart(): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        map(() => undefined),
        tap(() => this.cartSubject.next({ items: [], itemCount: 0, total: 0 })),
        catchError(this.handleError)
      );
  }

  /**
   * Get Item Count
   * Returns total number of items in cart (synchronous)
   * @return number Total item count
   */
  getItemCount(): number {
    return this.cartSubject.value.itemCount;
  }

  /**
   * Get Total
   * Returns cart total price (synchronous)
   * @return number Total price
   */
  getTotal(): number {
    return this.cartSubject.value.total;
  }

  /**
   * Get Session ID
   * Returns current session ID for guest users
   * @return string | null Session ID or null
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Clear Session
   * Clears cart for guest users on logout
   * @return void
   */
  clearSession(): void {
    if (!this.authService.isAuthenticated()) {
      this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
    }
  }

  /**
   * Load Cart
   * Internal method to fetch and update cart state
   * @return void
   */
  private loadCart(): void {
    this.getCart().subscribe({
      next: (cart) => {
        this.cartSubject.next(cart);
      },
      error: () => {
        console.error("Failed to load cart");
        this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
      },
    });
  }

  /**
   * Get Or Create Session ID
   * Retrieves existing session ID or creates new one for guest users
   * @return string Session ID
   */
  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(environment.sessionIdKey);

    if (!sessionId) {
      sessionId = this.generateSessionId();
      this.setSessionId(sessionId);
    } else {
      // Ensure localStorage is in sync
      localStorage.setItem(environment.sessionIdKey, sessionId);
    }
    return sessionId;
  }

  /**
   * Generate Session ID
   * Creates unique session ID for guest users
   * @return string Generated session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set Session ID
   * Stores session ID in memory and localStorage
   * @param sessionId Session ID to store
   * @return void
   */
  private setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem(environment.sessionIdKey, sessionId);
  }

  /**
   * Get Headers
   * Creates HTTP headers with session ID for guest users
   * CRITICAL: Sends sessionId even when authenticated to enable cart merge
   * @return HttpHeaders Headers with session ID
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ "Content-Type": "application/json" });

    // Always send sessionId if exists (needed for cart merge after login)
    if (this.sessionId) {
      headers = headers.set("x-session-id", this.sessionId);
    }

    return headers;
  }

  /**
   * Handle Error
   * Centralized error handling for HTTP requests
   * @param error Error object
   * @return Observable<never> Error observable
   */
  private handleError(error: any): Observable<never> {
    console.error("Cart service error:", error);
    return throwError(() => error);
  }
}
