/**
 * Wishlist Service
 * Handles wishlist operations
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Album, ApiResponse } from '../models/album.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private apiUrl = `${environment.apiUrl}/wishlist`;
  private wishlistSubject = new BehaviorSubject<string[]>([]);
  public wishlist$ = this.wishlistSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Initialize wishlist when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user && user.wishlist) {
        this.wishlistSubject.next(user.wishlist);
      } else {
        this.wishlistSubject.next([]);
      }
    });
  }

  /**
   * Get user's wishlist albums
   * @returns Observable of albums array
   */
  getWishlist(): Observable<Album[]> {
    return this.http.get<ApiResponse<Album[]>>(this.apiUrl).pipe(
      map(response => response.data || []),
      tap(albums => {
        // Update wishlist IDs
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
  addToWishlist(albumId: string): Observable<string[]> {
    return this.http.post<ApiResponse<{ wishlist: string[] }>>(
      `${this.apiUrl}/${albumId}`,
      {}
    ).pipe(
      map(response => response.data?.wishlist || []),
      tap(wishlist => {
        this.wishlistSubject.next(wishlist);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Remove album from wishlist
   * @param albumId Album ID to remove
   * @returns Observable of updated wishlist
   */
  removeFromWishlist(albumId: string): Observable<string[]> {
    return this.http.delete<ApiResponse<{ wishlist: string[] }>>(
      `${this.apiUrl}/${albumId}`
    ).pipe(
      map(response => response.data?.wishlist || []),
      tap(wishlist => {
        this.wishlistSubject.next(wishlist);
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
   * Toggle album in wishlist
   * @param albumId Album ID to toggle
   * @returns Observable of updated wishlist
   */
  toggleWishlist(albumId: string): Observable<string[]> {
    if (this.isInWishlist(albumId)) {
      return this.removeFromWishlist(albumId);
    } else {
      return this.addToWishlist(albumId);
    }
  }

  /**
   * Get wishlist count
   * @returns Current wishlist count
   */
  getWishlistCount(): number {
    return this.wishlistSubject.value.length;
  }

  /**
   * Clear local wishlist (used on logout)
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