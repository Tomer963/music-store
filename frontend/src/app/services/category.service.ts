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
   * Fetches all categories with albums
   * 
   * @return (Observable<Category[]>) Array of categories
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
      catchError(this.handleError)
    );
  }

  /**
   * Get Category
   * Fetches single category by ID
   * 
   * @param (string) id - Category ID
   * @return (Observable<Category>) Category data
   */
  getCategory(id: string): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${id}`).pipe(
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