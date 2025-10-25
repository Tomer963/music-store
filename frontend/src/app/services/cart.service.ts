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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /**
   * Initialize Cart
   *
   * Restores cart from session or user account
   *
   * @return void
   */
  initializeCart(): void {
    this.sessionId = this.getOrCreateSessionId();
    this.loadCart();
  }

  /**
   * Refresh Cart
   *
   * Reloads cart and merges guest cart with user cart after login
   *
   * @return Refreshed cart data
   */
  refreshCart(): Observable<Cart> {
    const isAuth = this.authService.isAuthenticated();

    return this.getCart().pipe(
      tap((cart) => {
        this.cartSubject.next(cart);

        // Clear session ID after merge for authenticated users
        if (isAuth && this.sessionId) {
          this.sessionId = null;
          localStorage.removeItem(environment.sessionIdKey);
        }
      }),
    );
  }

  /**
   * Get Cart
   *
   * Fetches current cart from server
   *
   * @return Cart data
   */
  getCart(): Observable<Cart> {
    return this.http
      .get<ApiResponse<Cart>>(this.apiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => {
          return response.data || { items: [], itemCount: 0, total: 0 };
        }),
        catchError(() => {
          return of({ items: [], itemCount: 0, total: 0 });
        }),
      );
  }

  /**
   * Add To Cart
   *
   * Adds item to cart or increases quantity
   *
   * @param albumId - Album ID to add
   * @param quantity - Quantity to add
   * @return Response with sessionId for guests
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
          // Store session ID for guest users
          if (response.sessionId && !this.authService.isAuthenticated()) {
            this.setSessionId(response.sessionId);
          }
          this.loadCart();
        }),
        catchError(this.handleError),
      );
  }

  /**
   * Update Cart Item
   *
   * Updates quantity of existing cart item
   *
   * @param itemId - Cart item ID
   * @param quantity - New quantity
   * @return Updated cart item
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
        catchError(this.handleError),
      );
  }

  /**
   * Remove From Cart
   *
   * Removes item completely from cart
   *
   * @param itemId - Cart item ID to remove
   * @return void
   */
  removeFromCart(itemId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/items/${itemId}`, {
        headers: this.getHeaders(),
      })
      .pipe(
        map(() => undefined),
        tap(() => this.loadCart()),
        catchError(this.handleError),
      );
  }

  /**
   * Clear Cart
   *
   * Removes all items from cart
   *
   * @return void
   */
  clearCart(): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(this.apiUrl, {
        headers: this.getHeaders(),
      })
      .pipe(
        map(() => undefined),
        tap(() => this.cartSubject.next({ items: [], itemCount: 0, total: 0 })),
        catchError(this.handleError),
      );
  }

  /**
   * Get Item Count
   *
   * Returns total items in cart
   *
   * @return Total item count
   */
  getItemCount(): number {
    return this.cartSubject.value.itemCount;
  }

  /**
   * Get Total
   *
   * Returns cart total price
   *
   * @return Total price
   */
  getTotal(): number {
    return this.cartSubject.value.total;
  }

  /**
   * Get Session ID
   *
   * Returns current session ID for guest users
   *
   * @return Session ID or null
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Clear Session
   *
   * Clears cart for guest users on logout
   *
   * @return void
   */
  clearSession(): void {
    if (!this.authService.isAuthenticated()) {
      this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
    }
  }

  /**
   * Load Cart
   *
   * Internal method to fetch and update cart state
   *
   * @return void
   */
  private loadCart(): void {
    this.getCart().subscribe({
      next: (cart) => {
        this.cartSubject.next(cart);
      },
      error: () => {
        this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
      },
    });
  }

  /**
   * Get Or Create Session ID
   *
   * Retrieves existing session ID or creates new one
   *
   * @return Session ID
   */
  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(environment.sessionIdKey);

    if (!sessionId) {
      sessionId = this.generateSessionId();
      this.setSessionId(sessionId);
    } else {
      localStorage.setItem(environment.sessionIdKey, sessionId);
    }
    return sessionId;
  }

  /**
   * Generate Session ID
   *
   * Creates unique session ID for guest users
   *
   * @return Generated session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set Session ID
   *
   * Stores session ID in memory and localStorage
   *
   * @param sessionId - Session ID to store
   * @return void
   */
  private setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem(environment.sessionIdKey, sessionId);
  }

  /**
   * Get Headers
   *
   * Creates HTTP headers with session ID
   *
   * @return Headers with session ID for cart merge
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ "Content-Type": "application/json" });

    if (this.sessionId) {
      headers = headers.set("x-session-id", this.sessionId);
    }

    return headers;
  }

  /**
   * Handle Error
   *
   * Centralized error handling
   *
   * @param error - Error object
   * @return Error observable
   */
  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}