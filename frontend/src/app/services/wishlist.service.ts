import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private wishlistKey = 'music_store_wishlist';
  private wishlistSubject = new BehaviorSubject<string[]>([]);
  public wishlist$ = this.wishlistSubject.asObservable();

  constructor() {
    this.loadWishlist();
  }

  /**
   * Load wishlist from localStorage
   */
  private loadWishlist(): void {
    const wishlistStr = localStorage.getItem(this.wishlistKey);
    if (wishlistStr) {
      try {
        const wishlist = JSON.parse(wishlistStr);
        this.wishlistSubject.next(wishlist);
      } catch (error) {
        this.wishlistSubject.next([]);
      }
    }
  }

  /**
   * Save wishlist to localStorage
   */
  private saveWishlist(wishlist: string[]): void {
    localStorage.setItem(this.wishlistKey, JSON.stringify(wishlist));
    this.wishlistSubject.next(wishlist);
  }

  /**
   * Get current wishlist
   */
  getWishlist(): string[] {
    return this.wishlistSubject.value;
  }

  /**
   * Check if album is in wishlist
   */
  isInWishlist(albumId: string): boolean {
    return this.wishlistSubject.value.includes(albumId);
  }

  /**
   * Add album to wishlist
   */
  addToWishlist(albumId: string): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => {
        const currentWishlist = this.wishlistSubject.value;
        if (!currentWishlist.includes(albumId)) {
          this.saveWishlist([...currentWishlist, albumId]);
        }
      })
    );
  }

  /**
   * Remove album from wishlist
   */
  removeFromWishlist(albumId: string): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => {
        const currentWishlist = this.wishlistSubject.value;
        const updatedWishlist = currentWishlist.filter(id => id !== albumId);
        this.saveWishlist(updatedWishlist);
      })
    );
  }

  /**
   * Clear wishlist
   */
  clearWishlist(): Observable<void> {
    return of(undefined).pipe(
      delay(300),
      tap(() => {
        this.saveWishlist([]);
      })
    );
  }

  /**
   * Get wishlist count
   */
  getWishlistCount(): number {
    return this.wishlistSubject.value.length;
  }
}