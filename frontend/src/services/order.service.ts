import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';  // תיקון הנתיב
import { Order, CreateOrderRequest } from '../models/order.model';
import { ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Get user's orders
   * @returns Observable of orders array
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(this.apiUrl).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Get order by ID
   * @param id Order ID
   * @returns Observable of order
   */
  getOrder(id: string): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Create new order
   * @param orderData Order data
   * @returns Observable of created order
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(this.apiUrl, orderData).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Cancel order
   * @param id Order ID
   * @returns Observable of updated order
   */
  cancelOrder(id: string): Observable<Order> {
    return this.http.put<ApiResponse<Order>>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      map(response => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Format order number for display
   * @param orderNumber Order number
   * @returns Formatted order number
   */
  formatOrderNumber(orderNumber: string): string {
    return `#${orderNumber}`;
  }

  /**
   * Get order status display text
   * @param status Order status
   * @returns Display text
   */
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pending',
      'processing': 'Processing',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  /**
   * Get order status color class
   * @param status Order status
   * @returns CSS class name
   */
  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'processing': 'status-processing',
      'shipped': 'status-shipped',
      'delivered': 'status-delivered',
      'cancelled': 'status-cancelled'
    };
    return classMap[status] || '';
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