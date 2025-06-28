/**
 * Category Service
 * Handles category-related API operations
 */

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Category, ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  /**
   * Get all categories
   * @returns Observable of categories array
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(this.apiUrl).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Get category by ID
   * @param id Category ID
   * @returns Observable of category
   */
  getCategory(id: string): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Get category with albums
   * @param id Category ID
   * @returns Observable of category with album data
   */
  getCategoryWithAlbums(id: string): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}/albums`).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error("Category service error:", error);
    return throwError(() => error);
  }
}
