import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map, catchError, tap } from "rxjs/operators";
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
   * @return Observable<Category[]> Array of categories
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(this.apiUrl).pipe(
      tap((response) => {
        // ✅ Log response for debugging
        console.log('🔍 Categories API Response:', response);
        console.log('🔍 Categories data:', response.data);
        console.log('🔍 Number of categories:', response.data?.length || 0);
      }),
      map((response) => {
        const categories = response.data || [];
        
        // ✅ Log each category
        categories.forEach(cat => {
          console.log(`📁 ${cat.name} - Active: ${cat.isActive}, Albums: ${cat.albumCount || 0}`);
        });
        
        // ✅ Filter only active categories (backend should do this, but double-check)
        const activeCategories = categories.filter(cat => cat.isActive !== false);
        console.log(`✅ Active categories: ${activeCategories.length}/${categories.length}`);
        
        // ✅ Sort alphabetically
        const sorted = activeCategories.sort((a, b) => 
          a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
        );
        
        console.log('📊 Final sorted categories:', sorted.map(c => c.name));
        
        return sorted;
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