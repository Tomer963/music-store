/**
 * Album Service
 * Handles all album-related API operations
 */

import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Album, PaginatedResponse, ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class AlbumService {
  private apiUrl = `${environment.apiUrl}/albums`;

  constructor(private http: HttpClient) {}

  /**
   * Get all albums with pagination
   * @param page Page number
   * @param limit Items per page
   * @param sort Sort order
   * @returns Observable of paginated albums
   */
  getAlbums(
    page: number = 1,
    limit: number = 12,
    sort: string = "-createdAt"
  ): Observable<PaginatedResponse<Album>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString())
      .set("sort", sort);

    return this.http
      .get<PaginatedResponse<Album>>(this.apiUrl, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get single album by ID
   * @param id Album ID
   * @returns Observable of album
   */
  getAlbum(id: string): Observable<Album> {
    return this.http.get<ApiResponse<Album>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError(this.handleError)
    );
  }

  /**
   * Get new albums (latest 23)
   * @returns Observable of albums array
   */
  getNewAlbums(): Observable<Album[]> {
    return this.http.get<ApiResponse<Album[]>>(`${this.apiUrl}/new`).pipe(
      map((response) => response.data || []),
      catchError(this.handleError)
    );
  }

  /**
   * Search albums
   * @param query Search query
   * @returns Observable of albums array
   */
  searchAlbums(query: string): Observable<Album[]> {
    const params = new HttpParams().set("q", query);

    return this.http
      .get<ApiResponse<Album[]>>(`${this.apiUrl}/search`, { params })
      .pipe(
        map((response) => response.data || []),
        catchError(this.handleError)
      );
  }

  /**
   * Get albums by category
   * @param categoryId Category ID
   * @param page Page number
   * @param limit Items per page
   * @returns Observable of paginated albums
   */
  getAlbumsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 12
  ): Observable<PaginatedResponse<Album>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString())
      .set("category", categoryId);

    return this.http
      .get<PaginatedResponse<Album>>(this.apiUrl, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get main image URL for an album
   * @param album Album object
   * @returns Main image URL or placeholder
   */
  getMainImageUrl(album: Album): string {
    // Check if album has images
    if (!album.images || album.images.length === 0) {
      return "https://via.placeholder.com/400x400/333/fff?text=No+Image";
    }

    // Find main image
    const mainImage = album.images.find((img) => img.isMain);
    const imageUrl = mainImage ? mainImage.url : album.images[0].url;

    // Fix for relative URLs - prepend base URL
    if (imageUrl.startsWith('/assets/')) {
      return `http://localhost:3000${imageUrl}`;
    }

    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Default placeholder
    return "https://via.placeholder.com/400x400/333/fff?text=" + encodeURIComponent(album.title);
  }

  /**
   * Format album price
   * @param price Album price
   * @returns Formatted price string
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error("Album service error:", error);
    return throwError(() => error);
  }
}