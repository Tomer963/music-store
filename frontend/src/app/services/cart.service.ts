/**
 * Cart Service
 * Handles shopping cart operations and state management
 */

import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { BehaviorSubject, Observable, throwError, interval } from "rxjs";
import { tap, catchError, map, switchMap } from "rxjs/operators";
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
   * Initialize cart on app startup
   */
  initializeCart(): void {
    // Get or create session ID
    this.sessionId = this.getOrCreateSessionId();

    // Load cart
    this.loadCart();

    // Set up periodic cart updates
    interval(environment.cartUpdateInterval)
      .pipe(switchMap(() => this.getCart()))
      .subscribe({
        next: (cart) => this.cartSubject.next(cart),
        error: (error) => console.error("Failed to update cart:", error)
      });
  }

  /**
   * Get current cart
   * @returns Observable of cart
   */
  getCart(): Observable<Cart> {
    const headers = this.getHeaders();

    return this.http.get<ApiResponse<Cart>>(this.apiUrl, { headers }).pipe(
      map((response) => response.data || { items: [], itemCount: 0, total: 0 }),
      tap((cart) => this.cartSubject.next(cart)),
      catchError(this.handleError)
    );
  }

  /**
   * Add item to cart
   * @param albumId Album ID
   * @param quantity Quantity to add
   * @returns Observable of cart response
   */
  addToCart(albumId: string, quantity: number = 1): Observable<CartResponse> {
    const headers = this.getHeaders();
    const request: AddToCartRequest = { albumId, quantity };

    return this.http
      .post<ApiResponse<CartResponse>>(`${this.apiUrl}/items`, request, {
        headers,
      })
      .pipe(
        map((response) => response.data!),
        tap((response) => {
          // Update session ID if returned
          if (response.sessionId) {
            this.setSessionId(response.sessionId);
          }
          // Reload cart
          this.loadCart();
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Update cart item quantity
   * @param itemId Cart item ID
   * @param quantity New quantity
   * @returns Observable of cart item
   */
  updateCartItem(itemId: string, quantity: number): Observable<CartItem> {
    const headers = this.getHeaders();
    const request: UpdateCartItemRequest = { quantity };

    return this.http
      .put<ApiResponse<CartItem>>(`${this.apiUrl}/items/${itemId}`, request, {
        headers,
      })
      .pipe(
        map((response) => response.data!),
        tap(() => this.loadCart()),
        catchError(this.handleError)
      );
  }

  /**
   * Remove item from cart
   * @param itemId Cart item ID
   * @returns Observable of success response
   */
  removeFromCart(itemId: string): Observable<void> {
    const headers = this.getHeaders();

    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/items/${itemId}`, { headers })
      .pipe(
        map(() => undefined),
        tap(() => this.loadCart()),
        catchError(this.handleError)
      );
  }

  /**
   * Clear cart
   * @returns Observable of success response
   */
  clearCart(): Observable<void> {
    const headers = this.getHeaders();

    return this.http.delete<ApiResponse<void>>(this.apiUrl, { headers }).pipe(
      map(() => undefined),
      tap(() => {
        this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get cart item count
   * @returns Current item count
   */
  getItemCount(): number {
    return this.cartSubject.value.itemCount;
  }

  /**
   * Get cart total
   * @returns Current cart total
   */
  getTotal(): number {
    return this.cartSubject.value.total;
  }

  /**
   * Load cart from server
   */
  private loadCart(): void {
    this.getCart().subscribe({
      next: (cart) => {
        this.cartSubject.next(cart);
      },
      error: (error) => {
        console.error("Failed to load cart:", error);
        // Set empty cart on error
        this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
      },
    });
  }

  /**
   * Get or create session ID
   * @returns Session ID
   */
  private getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem(environment.sessionIdKey);

    if (!sessionId) {
      sessionId = this.generateSessionId();
      this.setSessionId(sessionId);
    }

    return sessionId;
  }

  /**
   * Generate new session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set session ID
   * @param sessionId Session ID
   */
  private setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem(environment.sessionIdKey, sessionId);
  }

  /**
   * Get headers for requests
   * @returns HTTP headers
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();

    // Add session ID for anonymous users
    if (!this.authService.isAuthenticated() && this.sessionId) {
      headers = headers.set("x-session-id", this.sessionId);
    }

    return headers;
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error("Cart service error:", error);
    return throwError(() => error);
  }
}