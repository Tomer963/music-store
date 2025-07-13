import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, tap, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Cart, CartResponse, CartItem } from '../models/cart.model';
import { AlbumService } from './album.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cart`;
  private cartSubject = new BehaviorSubject<Cart>({ items: [], itemCount: 0, total: 0 });
  public cart$ = this.cartSubject.asObservable();
  
  // Demo cart data
  private demoCart: Cart = {
    items: [],
    itemCount: 0,
    total: 0
  };

  constructor(
    private http: HttpClient,
    private albumService: AlbumService
  ) {}

  initializeCart(): void {
    // Initialize with empty cart
    this.cartSubject.next(this.demoCart);
  }

  getCart(): Observable<Cart> {
    return of(this.demoCart).pipe(delay(300));
  }

  addToCart(albumId: string): Observable<CartResponse> {
    // First get the album
    return this.albumService.getAlbum(albumId).pipe(
      delay(500),
      tap(album => {
        const existingItem = this.demoCart.items.find(item => item.album._id === albumId);
        
        if (existingItem) {
          existingItem.quantity++;
        } else {
          const newItem: CartItem = {
            _id: Date.now().toString(),
            album: album,
            quantity: 1
          };
          this.demoCart.items.push(newItem);
        }
        
        this.updateCartTotals();
        this.cartSubject.next(this.demoCart);
      }),
      // Transform the response to CartResponse
      map(album => {
        const cartItem = this.demoCart.items.find(item => item.album._id === albumId);
        return {
          item: cartItem,
          sessionId: 'demo-session'
        } as CartResponse;
      })
    );
  }

  removeFromCart(itemId: string): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => {
        this.demoCart.items = this.demoCart.items.filter(item => item._id !== itemId);
        this.updateCartTotals();
        this.cartSubject.next(this.demoCart);
      })
    );
  }

  updateCartItem(itemId: string, quantity: number): Observable<CartItem> {
    const item = this.demoCart.items.find(i => i._id === itemId);
    if (item) {
      item.quantity = quantity;
      this.updateCartTotals();
      this.cartSubject.next(this.demoCart);
      return of(item).pipe(delay(300));
    }
    throw new Error('Item not found');
  }

  clearCart(): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => {
        this.demoCart = { items: [], itemCount: 0, total: 0 };
        this.cartSubject.next(this.demoCart);
      })
    );
  }

  private updateCartTotals(): void {
    this.demoCart.itemCount = this.demoCart.items.reduce((sum, item) => sum + item.quantity, 0);
    this.demoCart.total = this.demoCart.items.reduce((sum, item) => sum + (item.album.price * item.quantity), 0);
  }

  getItemCount(): number {
    return this.demoCart.itemCount;
  }

  getTotal(): number {
    return this.demoCart.total;
  }
}