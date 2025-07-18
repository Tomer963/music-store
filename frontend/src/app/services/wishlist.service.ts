/**
 * Wishlist Service
 * Handles wishlist operations
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Album, ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = `${environment.apiUrl}/wishlist`;
  private wishlistSubject = new BehaviorSubject<string[]>([]);
  public wishlist$ = this.wishlistSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get user's wishlist
   * @returns Observable of albums array
   */
  getWishlist(): Observable<Album[]> {
    return this.http.get<ApiResponse<Album[]>>(this.apiUrl).pipe(
      map(response => response.data || []),
      tap(albums => {
        // Update wishlist subject with album IDs
        const albumIds = albums.map(album => album._id);
        this.wishlistSubject.next(albumIds);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Add album to wishlist
   * @param albumId Album ID to add
   * @returns Observable of updated wishlist
   */
  addToWishlist(albumId: string): Observable<{ wishlist: string[] }> {
    console.log('Adding to wishlist, albumId:', albumId);
    console.log('URL:', `${this.apiUrl}/${albumId}`);
    
    // The backend expects albumId as a URL parameter, not in the body
    return this.http.post<ApiResponse<{ wishlist: string[] }>>(
      `${this.apiUrl}/${albumId}`,
      {} // Empty body since albumId is in URL
    ).pipe(
      map(response => {
        console.log('Wishlist add response:', response);
        return response.data!;
      }),
      tap(data => {
        if (data.wishlist) {
          this.wishlistSubject.next(data.wishlist);
        }
      }),
      catchError(error => {
        console.error('Wishlist error details:', error);
        if (error.error) {
          console.error('Error body:', error.error);
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Remove album from wishlist
   * @param albumId Album ID to remove
   * @returns Observable of updated wishlist
   */
  removeFromWishlist(albumId: string): Observable<{ wishlist: string[] }> {
    return this.http.delete<ApiResponse<{ wishlist: string[] }>>(
      `${this.apiUrl}/${albumId}`
    ).pipe(
      map(response => response.data!),
      tap(data => {
        if (data.wishlist) {
          this.wishlistSubject.next(data.wishlist);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Check if album is in wishlist
   * @param albumId Album ID to check
   * @returns true if in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistSubject.value.includes(albumId);
  }

  /**
   * Get current wishlist IDs
   * @returns Array of album IDs
   */
  getWishlistIds(): string[] {
    return this.wishlistSubject.value;
  }

  /**
   * Clear local wishlist (on logout)
   */
  clearWishlist(): void {
    this.wishlistSubject.next([]);
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error('Wishlist service error:', error);
    return throwError(() => error);
  }
}