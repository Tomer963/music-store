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

  initializeCart(): void {
    this.sessionId = this.getOrCreateSessionId();
    this.loadCart();
  }

  refreshCart(): Observable<Cart> {
    const isAuth = this.authService.isAuthenticated();

    return this.getCart().pipe(
      tap((cart) => {
        this.cartSubject.next(cart);

        if (isAuth && this.sessionId) {
          this.sessionId = null;
          localStorage.removeItem(environment.sessionIdKey);
        }
      })
    );
  }

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

  addToCart(albumId: string, quantity = 1): Observable<CartResponse> {
    const request: AddToCartRequest = { albumId, quantity };

    return this.http
      .post<ApiResponse<CartResponse>>(`${this.apiUrl}/items`, request, {
        headers: this.getHeaders(),
      })
      .pipe(
        map((response) => response.data!),
        tap((response) => {
          if (response.sessionId && !this.authService.isAuthenticated()) {
            this.setSessionId(response.sessionId);
          }
          this.loadCart();
        }),
        catchError(this.handleError)
      );
  }

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

  getItemCount(): number {
    return this.cartSubject.value.itemCount;
  }

  getTotal(): number {
    return this.cartSubject.value.total;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  clearSession(): void {
    if (!this.authService.isAuthenticated()) {
      this.cartSubject.next({ items: [], itemCount: 0, total: 0 });
    }
  }

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

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem(environment.sessionIdKey, sessionId);
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({ "Content-Type": "application/json" });

    if (this.sessionId) {
      headers = headers.set("x-session-id", this.sessionId);
    }

    return headers;
  }

  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}