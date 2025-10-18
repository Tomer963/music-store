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
   * @return Observable<Category[]> Array of categories
   */
 getCategories(): Observable<Category[]> {
  return this.http.get<ApiResponse<Category[]>>(this.apiUrl).pipe(
    map((response) => {
      const categories = response.data || [];
      // ✅ מיון אלפביתי לפי שם הקטגוריה
      return categories.sort((a, b) => a.name.localeCompare(b.name, 'he'));
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
