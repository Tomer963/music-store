import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Order, CreateOrderRequest } from "../models/order.model";
import { ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/orders`;

  constructor(private http: HttpClient) {}

  /**
   * Get Orders
   *
   * Fetches all orders for the authenticated user
   *
   * @return Array of user orders
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(this.apiUrl).pipe(
      map((response) => response.data!),
      catchError(this.handleError),
    );
  }

  /**
   * Get Order
   *
   * Fetches a single order by ID
   *
   * @param id - Order ID
   * @return Order details
   */
  getOrder(id: string): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError(this.handleError),
    );
  }

  /**
   * Create Order
   *
   * Creates a new order from current cart
   *
   * @param orderData - Order creation data
   * @return Created order
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(this.apiUrl, orderData).pipe(
      map((response) => response.data!),
      catchError(this.handleError),
    );
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