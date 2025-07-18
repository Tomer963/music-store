/**
 * Order Service
 * Handles order-related operations
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Order, CreateOrderRequest } from '../models/order.model';
import { ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new order
   * @param orderData Order data
   * @returns Observable of created order
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(this.apiUrl, orderData)
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  /**
   * Get user's orders
   * @returns Observable of orders array
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(this.apiUrl)
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  /**
   * Get order by ID
   * @param orderId Order ID
   * @returns Observable of order
   */
  getOrder(orderId: string): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/${orderId}`)
      .pipe(
        map(response => response.data!),
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error('Order service error:', error);
    return throwError(() => error);
  }
}