import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cart, CartResponse } from '../models/cart.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = `${environment.apiUrl}/cart`;
  private cartSubject = new BehaviorSubject<Cart>({ items: [], itemCount: 0, total: 0 });
  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {}

  initializeCart(): void {
    // TODO: Implement
  }

  addToCart(albumId: string): Observable<CartResponse> {
    // TODO: Implement
    return of({ sessionId: '123' });
  }

  removeFromCart(itemId: string): Observable<void> {
    // TODO: Implement
    return of(undefined);
  }
}