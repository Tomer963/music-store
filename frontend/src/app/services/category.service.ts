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
   * Get Categories
   * Fetch all active categories from the API
   * Returns only categories that have albums (albumCount > 0)
   * @return Observable<Category[]> Array of categories with albums
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(this.apiUrl).pipe(
      map((response) => {
        const categories = response.data || [];
        
        // Filter active categories with albums
        const categoriesWithAlbums = categories.filter(
          cat => cat.isActive !== false && (cat.albumCount || 0) > 0
        );
        
        // Sort alphabetically
        return categoriesWithAlbums.sort((a, b) => 
          a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
        );
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get Category
   * Fetch a single category by ID
   * @param id Category ID
   * @return Observable<Category> Category data
   */
  getCategory(id: string): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Handle Error
   * Centralized error handling for HTTP requests
   * @param error Error object
   * @return Observable<never> Error observable
   */
  private handleError(error: any): Observable<never> {
    console.error("Category service error:", error);
    return throwError(() => error);
  }
}