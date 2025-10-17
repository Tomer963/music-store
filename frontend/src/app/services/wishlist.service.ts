import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, throwError, of, BehaviorSubject, forkJoin } from "rxjs";
import { map, catchError, tap, switchMap } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Album, ApiResponse } from "../models/album.model";
import { AuthService } from "./auth.service";

@Injectable({
  providedIn: "root",
})
export class WishlistService {
  private apiUrl = `${environment.apiUrl}/wishlist`;
  private albumsApiUrl = `${environment.apiUrl}/albums`;
  private localStorageKey = "music_store_wishlist";

  // Store wishlist album IDs for quick lookup
  private wishlistIdsSubject = new BehaviorSubject<Set<string>>(new Set());
  public wishlistIds$ = this.wishlistIdsSubject.asObservable();

  // Store full album objects for wishlist page
  private wishlistAlbumsSubject = new BehaviorSubject<Album[]>([]);
  public wishlistAlbums$ = this.wishlistAlbumsSubject.asObservable();

  // Global loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Per-item loading states (for individual add/remove operations)
  private itemLoadingStates = new Map<string, boolean>();
  private itemLoadingSubject = new BehaviorSubject<Map<string, boolean>>(
    new Map()
  );
  public itemLoading$ = this.itemLoadingSubject.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    this.initializeWishlistIds();

    // Sync local wishlist to server when user logs in
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.syncLocalToServer().subscribe();
      }
      this.initializeWishlistIds();
    });
  }

  /**
   * Toggle Wishlist
   * Add or remove album from wishlist with loading state management
   * @param albumId Album ID to toggle
   * @return Observable<boolean> True if added, false if removed
   */
  toggleWishlist(albumId: string): Observable<boolean> {
    this.setItemLoading(albumId, true);
    const isInWishlist = this.wishlistIdsSubject.value.has(albumId);

    // Remove if already in wishlist, add if not
    const operation$ = isInWishlist
      ? this.removeFromWishlist(albumId).pipe(map(() => false))
      : this.addToWishlist(albumId).pipe(map(() => true));

    return operation$.pipe(
      tap(() => this.setItemLoading(albumId, false)),
      catchError((error) => {
        this.setItemLoading(albumId, false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Is Item Loading
   * Check if specific item is currently being added/removed
   * @param albumId Album ID
   * @return boolean Loading state
   */
  isItemLoading(albumId: string): boolean {
    return this.itemLoadingStates.get(albumId) || false;
  }

  /**
   * Set Item Loading
   * Update loading state for specific item and notify subscribers
   * @param albumId Album ID
   * @param isLoading Loading state
   * @return void
   */
  private setItemLoading(albumId: string, isLoading: boolean): void {
    this.itemLoadingStates.set(albumId, isLoading);
    this.itemLoadingSubject.next(new Map(this.itemLoadingStates));
  }

  /**
   * Is In Wishlist
   * Check if album is in wishlist (reactive)
   * @param albumId Album ID
   * @return Observable<boolean> True if in wishlist
   */
  isInWishlist(albumId: string): Observable<boolean> {
    return this.wishlistIds$.pipe(map((ids) => ids.has(albumId)));
  }

  /**
   * Get Real Time Wishlist
   * Get wishlist albums as observable for reactive updates
   * @return Observable<Album[]> Wishlist albums
   */
  getRealTimeWishlist(): Observable<Album[]> {
    return this.wishlistAlbums$;
  }

  /**
   * Refresh Wishlist
   * Force reload wishlist from server or localStorage
   * @return void
   */
  refreshWishlist(): void {
    this.initializeWishlistIds();
  }

  /**
   * Add To Wishlist
   * Internal method to add album to wishlist
   * @param albumId Album ID
   * @return Observable<{wishlist: string[]}> Updated wishlist
   */
  private addToWishlist(albumId: string): Observable<{ wishlist: string[] }> {
    const currentIds = this.wishlistIdsSubject.value;

    // Skip if already in wishlist
    if (currentIds.has(albumId)) {
      return of({ wishlist: Array.from(currentIds) });
    }

    // Use server or local storage based on auth status
    if (this.authService.isAuthenticated()) {
      return this.addToServerWishlist(albumId);
    }
    return this.addToLocalWishlist(albumId);
  }

  /**
   * Remove From Wishlist
   * Internal method to remove album from wishlist
   * @param albumId Album ID
   * @return Observable<{wishlist: string[]}> Updated wishlist
   */
  private removeFromWishlist(
    albumId: string
  ): Observable<{ wishlist: string[] }> {
    if (this.authService.isAuthenticated()) {
      return this.removeFromServerWishlist(albumId);
    }
    return this.removeFromLocalWishlist(albumId);
  }

  /**
   * Initialize Wishlist IDs
   * Load wishlist from server (authenticated) or localStorage (guest)
   * @return void
   */
  private initializeWishlistIds(): void {
    this.loadingSubject.next(true);

    if (this.authService.isAuthenticated()) {
      // Fetch from server for authenticated users
      this.getServerWishlist().subscribe({
        next: (albums) => {
          const ids = new Set(albums.map((album) => album._id));
          this.wishlistIdsSubject.next(ids);
          this.wishlistAlbumsSubject.next(albums);
          this.loadingSubject.next(false);
        },
        error: () => {
          this.wishlistIdsSubject.next(new Set());
          this.wishlistAlbumsSubject.next([]);
          this.loadingSubject.next(false);
        },
      });
    } else {
      // Load from localStorage for guest users
      const ids = new Set(this.getLocalWishlistIds());
      this.wishlistIdsSubject.next(ids);
      this.loadLocalWishlistAlbums();
    }
  }

  /**
   * Get Server Wishlist
   * Fetch wishlist from API (authenticated users only)
   * @return Observable<Album[]> Wishlist albums
   */
  private getServerWishlist(): Observable<Album[]> {
    return this.http.get<ApiResponse<Album[]>>(this.apiUrl).pipe(
      map((response) => response.data || []),
      catchError(() => of([]))
    );
  }

  /**
   * Add To Server Wishlist
   * Add album to server wishlist and update local state
   * @param albumId Album ID
   * @return Observable<{wishlist: string[]}> Updated wishlist
   */
  private addToServerWishlist(
    albumId: string
  ): Observable<{ wishlist: string[] }> {
    return this.http
      .post<ApiResponse<{ wishlist: string[] }>>(
        `${this.apiUrl}/${albumId}`,
        {}
      )
      .pipe(
        map((response) => response.data!),
        tap(() => {
          // Update IDs immediately
          const newIds = new Set(this.wishlistIdsSubject.value);
          newIds.add(albumId);
          this.wishlistIdsSubject.next(newIds);

          // Fetch album details and add to albums list
          this.http
            .get<ApiResponse<Album>>(`${this.albumsApiUrl}/${albumId}`)
            .pipe(
              map((response) => response.data!),
              catchError(() => of(null))
            )
            .subscribe((album) => {
              if (album) {
                const currentAlbums = this.wishlistAlbumsSubject.value;
                this.wishlistAlbumsSubject.next([...currentAlbums, album]);
              }
            });
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Remove From Server Wishlist
   * Remove album from server wishlist and update local state
   * @param albumId Album ID
   * @return Observable<{wishlist: string[]}> Updated wishlist
   */
  private removeFromServerWishlist(
    albumId: string
  ): Observable<{ wishlist: string[] }> {
    return this.http
      .delete<ApiResponse<{ wishlist: string[] }>>(`${this.apiUrl}/${albumId}`)
      .pipe(
        map((response) => response.data!),
        tap(() => this.updateAfterRemoval(albumId)),
        catchError(this.handleError)
      );
  }

  /**
   * Add To Local Wishlist
   * Add album to localStorage wishlist (guest users)
   * @param albumId Album ID
   * @return Observable<{wishlist: string[]}> Updated wishlist
   */
  private addToLocalWishlist(
    albumId: string
  ): Observable<{ wishlist: string[] }> {
    const wishlistIds = this.getLocalWishlistIds();

    if (!wishlistIds.includes(albumId)) {
      wishlistIds.push(albumId);
      this.saveLocalWishlistIds(wishlistIds);

      // Update IDs immediately
      const newIds = new Set(this.wishlistIdsSubject.value);
      newIds.add(albumId);
      this.wishlistIdsSubject.next(newIds);

      // Fetch album details
      this.http
        .get<ApiResponse<Album>>(`${this.albumsApiUrl}/${albumId}`)
        .pipe(
          map((response) => response.data!),
          catchError(() => of(null))
        )
        .subscribe((album) => {
          if (album) {
            const currentAlbums = this.wishlistAlbumsSubject.value;
            this.wishlistAlbumsSubject.next([...currentAlbums, album]);
          }
        });
    }
    return of({ wishlist: wishlistIds });
  }

  /**
   * Remove From Local Wishlist
   * Remove album from localStorage wishlist (guest users)
   * @param albumId Album ID
   * @return Observable<{wishlist: string[]}> Updated wishlist
   */
  private removeFromLocalWishlist(
    albumId: string
  ): Observable<{ wishlist: string[] }> {
    let wishlistIds = this.getLocalWishlistIds();
    wishlistIds = wishlistIds.filter((id) => id !== albumId);
    this.saveLocalWishlistIds(wishlistIds);
    this.updateAfterRemoval(albumId);
    return of({ wishlist: wishlistIds });
  }

  /**
   * Update After Removal
   * Update state after removing item from wishlist
   * @param albumId Album ID
   * @return void
   */
  private updateAfterRemoval(albumId: string): void {
    // Remove from IDs set
    const newIds = new Set(this.wishlistIdsSubject.value);
    newIds.delete(albumId);
    this.wishlistIdsSubject.next(newIds);

    // Remove from albums array
    const currentAlbums = this.wishlistAlbumsSubject.value;
    this.wishlistAlbumsSubject.next(
      currentAlbums.filter((album) => album._id !== albumId)
    );
  }

  /**
   * Load Local Wishlist Albums
   * Fetch full album details for localStorage wishlist IDs
   * @return void
   */
  private loadLocalWishlistAlbums(): void {
    const localWishlistIds = this.getLocalWishlistIds();

    if (localWishlistIds.length === 0) {
      this.wishlistAlbumsSubject.next([]);
      this.loadingSubject.next(false);
      return;
    }

    this.wishlistIdsSubject.next(new Set(localWishlistIds));

    // Fetch all albums in parallel using forkJoin
    const albumRequests = localWishlistIds.map((id) =>
      this.http.get<ApiResponse<Album>>(`${this.albumsApiUrl}/${id}`).pipe(
        map((response) => response.data),
        catchError(() => of(null))
      )
    );

    if (albumRequests.length > 0) {
      forkJoin(albumRequests).subscribe({
        next: (albums) => {
          const validAlbums = albums.filter(
            (album) => album !== null
          ) as Album[];
          this.wishlistAlbumsSubject.next(validAlbums);
          this.loadingSubject.next(false);
        },
        error: () => {
          this.wishlistAlbumsSubject.next([]);
          this.loadingSubject.next(false);
        },
      });
    } else {
      this.wishlistAlbumsSubject.next([]);
      this.loadingSubject.next(false);
    }
  }

  /**
   * Sync Local To Server
   * Sync localStorage wishlist to server when user logs in
   * @return Observable<any> Sync result
   */
  private syncLocalToServer(): Observable<any> {
    const localWishlistIds = this.getLocalWishlistIds();
    if (localWishlistIds.length === 0) return of(null);

    // Add each local item to server in parallel
    const syncRequests = localWishlistIds.map((albumId) =>
      this.http
        .post<ApiResponse<{ wishlist: string[] }>>(
          `${this.apiUrl}/${albumId}`,
          {}
        )
        .pipe(catchError(() => of(null)))
    );

    return forkJoin(syncRequests).pipe(
      tap(() => {
        // Clear localStorage after successful sync
        this.clearLocalWishlist();
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Get Local Wishlist IDs
   * Retrieve wishlist IDs from localStorage
   * @return string[] Array of album IDs
   */
  private getLocalWishlistIds(): string[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      localStorage.removeItem(this.localStorageKey);
      return [];
    }
  }

  /**
   * Save Local Wishlist IDs
   * Store wishlist IDs in localStorage
   * @param wishlistIds Array of album IDs
   * @return void
   */
  private saveLocalWishlistIds(wishlistIds: string[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(wishlistIds));
    } catch (error) {
      console.error("Failed to save wishlist:", error);
    }
  }

  /**
   * Clear Local Wishlist
   * Remove wishlist from localStorage
   * @return void
   */
  private clearLocalWishlist(): void {
    localStorage.removeItem(this.localStorageKey);
  }

  /**
   * Handle Error
   * Centralized error handling for HTTP requests
   * @param error Error object
   * @return Observable<never> Error observable
   */
  private handleError(error: any): Observable<never> {
    if (error.status !== 404) {
      console.error("Wishlist service error:", error);
    }
    return throwError(() => error);
  }
}
