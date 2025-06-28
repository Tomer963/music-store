/**
 * Search Service
 * Handles search functionality
 */

import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, throwError, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Album, ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class SearchService {
  private apiUrl = `${environment.apiUrl}/albums/search`;
  private cache = new Map<string, Album[]>();

  constructor(private http: HttpClient) {}

  /**
   * Search for albums
   * @param query Search query
   * @returns Observable of albums array
   */
  searchAlbums(query: string): Observable<Album[]> {
    // Trim and validate query
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      return of([]);
    }

    // Check cache first
    if (this.cache.has(trimmedQuery)) {
      return of(this.cache.get(trimmedQuery)!);
    }

    // Make API request
    const params = new HttpParams().set("q", trimmedQuery);

    return this.http.get<ApiResponse<Album[]>>(this.apiUrl, { params }).pipe(
      map((response) => {
        const albums = response.data || [];
        // Cache the results
        this.cache.set(trimmedQuery, albums);
        // Limit cache size
        if (this.cache.size > 50) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
        return albums;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error("Search service error:", error);
    return throwError(() => error);
  }
}
