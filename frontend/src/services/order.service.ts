/**
 * Order Service
 * Handles order creation and management
 */

import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../environments/environment";
import { Order, CreateOrderRequest } from "../models/order.model";
import { ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Get user orders
   * @returns Observable of orders array
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(this.apiUrl).pipe(
      map((response) => response.data!),
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
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Create new order
   * @param orderData Order creation data
   * @returns Observable of created order
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    return this.http
      .post<ApiResponse<Order>>(this.apiUrl, orderData)
      .pipe(
        map((response) => response.data!),
        catchError(this.handleError)
      );
  }

  /**
   * Format order number
   * @param orderNumber Order number
   * @returns Formatted order number
   */
  formatOrderNumber(orderNumber: string): string {
    return orderNumber.toUpperCase();
  }

  /**
   * Get order status display text
   * @param status Order status
   * @returns Display text
   */
  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      pending: "Pending",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error("Order service error:", error);
    return throwError(() => error);
  }
}