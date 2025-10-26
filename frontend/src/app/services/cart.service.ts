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
   * Sets up cart with session ID and loads cart data
   * 
   * @return (void)
   */
  initializeCart(): void {
    this.sessionId = this.getOrCreateSessionId();
    this.loadCart();
  }

  /**
   * Refresh Cart
   * Reloads cart from server and updates local state
   * 
   * @return (Observable<Cart>) Updated cart data
   */
  refreshCart(): Observable<Cart> {
    const isAuth = this.authService.isAuthenticated();

    return this.getCart().pipe(
      tap((cart) => {
        this.cartSubject.next(cart);

        // Clear session ID after login
        if (isAuth && this.sessionId) {
          this.sessionId = null;
          localStorage.removeItem(environment.sessionIdKey);
        }
      })
    );
  }

  /**
   * Get Cart
   * Fetches cart from server
   * 
   * @return (Observable<Cart>) Cart data
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
        })
      );
  }

  /**
   * Add To Cart
   * Adds album to cart
   * 
   * @param (string) albumId - Album ID to add
   * @param (number) quantity - Quantity to add
   * @return (Observable<CartResponse>) Cart response with item
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
        catchError(this.handleError)
      );
  }

  /**
   * Update Cart Item
   * Updates quantity of cart item
   * 
   * @param (string) itemId - Cart item ID
   * @param (number) quantity - New quantity
   * @return (Observable<CartItem>) Updated cart item
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
   * Removes item from cart
   * 
   * @param (string) itemId - Cart item ID to remove
   * @return (Observable<void>) Void observable
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
   * 
   * @return (Observable<void>) Void observable
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
   * Returns total number of items in cart
   * 
   * @return (number) Item count
   */
  getItemCount(): number {
    return this.cartSubject.value.itemCount;
  }

  /**
   * Get Total
   * Returns cart total price
   * 
   * @return (number) Total price
   */
  getTotal(): number {
    return this.cartSubject.value.total;
  }

  /**
   * Get Session ID
   * Returns current session ID
   * 
   * @return (string | null) Session ID or null
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Clear Session
   * Clears cart for guest users
   * 
   * @return (void)
   */
  clearSession(): void {
    if (!this.authService.isAuthenticated()) {
      this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
    }
  }

  /**
   * Load Cart
   * Internal method to load cart data
   * 
   * @return (void)
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
   * Gets existing or creates new session ID
   * 
   * @return (string) Session ID
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
   * Creates unique session ID
   * 
   * @return (string) New session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set Session ID
   * Stores session ID in localStorage
   * 
   * @param (string) sessionId - Session ID to store
   * @return (void)
   */
  private setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem(environment.sessionIdKey, sessionId);
  }

  /**
   * Get Headers
   * Builds HTTP headers with session ID
   * 
   * @return (HttpHeaders) HTTP headers
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
   * Error handler for cart operations
   * 
   * @param (any) error - Error object
   * @return (Observable<never>) Error observable
   */
  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}