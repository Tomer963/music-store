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
   * Fetches all orders for authenticated user
   *
   * @return (Observable<Order[]>) Array of orders
   */
  getOrders(): Observable<Order[]> {
    return this.http.get<ApiResponse<Order[]>>(this.apiUrl).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Get Order
   * Fetches single order by ID
   *
   * @param (string) id - Order ID
   * @return (Observable<Order>) Order details
   */
  getOrder(id: string): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Create Order
   * Creates new order from cart
   *
   * @param (CreateOrderRequest) orderData - Order creation data
   * @return (Observable<Order>) Created order
   */
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    return this.http.post<ApiResponse<Order>>(this.apiUrl, orderData).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Handle Error
   * Centralized error handling
   *
   * @param (any) error - Error object
   * @return (Observable<never>) Error observable
   */
  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}
