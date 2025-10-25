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
   *
   * Fetches all categories that have albums
   *
   * @return Array of categories with albums
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(this.apiUrl).pipe(
      map((response) => {
        const categories = response.data || [];

        // Filter categories with albums and sort alphabetically
        return categories
          .filter((cat) => (cat.albumCount || 0) > 0)
          .sort((a, b) =>
            a.name.localeCompare(b.name, "en", { sensitivity: "base" })
          );
      }),
      catchError(this.handleError),
    );
  }

  /**
   * Get Category
   *
   * Fetches a single category by ID
   *
   * @param id - Category ID
   * @return Category data
   */
  getCategory(id: string): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${id}`).pipe(
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