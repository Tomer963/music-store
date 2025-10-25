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

  // Store album IDs for quick lookup
  private wishlistIdsSubject = new BehaviorSubject<Set<string>>(new Set());
  public wishlistIds$ = this.wishlistIdsSubject.asObservable();

  // Store full album objects for wishlist page
  private wishlistAlbumsSubject = new BehaviorSubject<Album[]>([]);
  public wishlistAlbums$ = this.wishlistAlbumsSubject.asObservable();

  // Global loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  // Per-item loading states
  private itemLoadingStates = new Map<string, boolean>();
  private itemLoadingSubject = new BehaviorSubject<Map<string, boolean>>(
    new Map(),
  );
  public itemLoading$ = this.itemLoadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
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
   * 
   * Adds or removes album from wishlist
   *
   * @param albumId Album identifier
   * @return Observable boolean indicating if item was added (true) or removed (false)
   */
  toggleWishlist(albumId: string): Observable<boolean> {
    this.setItemLoading(albumId, true);
    const isInWishlist = this.wishlistIdsSubject.value.has(albumId);

    const operation$ = isInWishlist
      ? this.removeFromWishlist(albumId).pipe(map(() => false))
      : this.addToWishlist(albumId).pipe(map(() => true));

    return operation$.pipe(
      tap(() => this.setItemLoading(albumId, false)),
      catchError((error) => {
        this.setItemLoading(albumId, false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Is Item Loading
   * 
   * Checks loading state for specific item
   *
   * @param albumId Album identifier
   * @return Boolean indicating if item is being processed
   */
  isItemLoading(albumId: string): boolean {
    return this.itemLoadingStates.get(albumId) || false;
  }

  /**
   * Is In Wishlist
   * 
   * Checks if album exists in wishlist reactively
   *
   * @param albumId Album identifier
   * @return Observable boolean indicating wishlist membership
   */
  isInWishlist(albumId: string): Observable<boolean> {
    return this.wishlistIds$.pipe(map((ids) => ids.has(albumId)));
  }

  /**
   * Get Real Time Wishlist
   * 
   * Returns current wishlist albums as observable stream
   *
   * @return Observable array of wishlist albums
   */
  getRealTimeWishlist(): Observable<Album[]> {
    return this.wishlistAlbums$;
  }

  /**
   * Refresh Wishlist
   * 
   * Forces reload of wishlist from source
   *
   * @return void
   */
  refreshWishlist(): void {
    this.initializeWishlistIds();
  }

  /**
   * Add To Wishlist
   * 
   * Internal method to add album to wishlist
   *
   * @param albumId Album identifier
   * @return Observable with updated wishlist IDs
   */
  private addToWishlist(albumId: string): Observable<{ wishlist: string[] }> {
    const currentIds = this.wishlistIdsSubject.value;

    if (currentIds.has(albumId)) {
      return of({ wishlist: Array.from(currentIds) });
    }

    return this.authService.isAuthenticated()
      ? this.addToServerWishlist(albumId)
      : this.addToLocalWishlist(albumId);
  }

  /**
   * Remove From Wishlist
   * 
   * Internal method to remove album from wishlist
   *
   * @param albumId Album identifier
   * @return Observable with updated wishlist IDs
   */
  private removeFromWishlist(
    albumId: string,
  ): Observable<{ wishlist: string[] }> {
    return this.authService.isAuthenticated()
      ? this.removeFromServerWishlist(albumId)
      : this.removeFromLocalWishlist(albumId);
  }

  /**
   * Initialize Wishlist IDs
   * 
   * Loads wishlist from appropriate source (server or localStorage)
   *
   * @return void
   */
  private initializeWishlistIds(): void {
    this.loadingSubject.next(true);

    if (this.authService.isAuthenticated()) {
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
      const ids = new Set(this.getLocalWishlistIds());
      this.wishlistIdsSubject.next(ids);
      this.loadLocalWishlistAlbums();
    }
  }

  /**
   * Get Server Wishlist
   * 
   * Fetches wishlist from API
   *
   * @return Observable array of wishlist albums
   */
  private getServerWishlist(): Observable<Album[]> {
    return this.http.get<ApiResponse<Album[]>>(this.apiUrl).pipe(
      map((response) => response.data || []),
      catchError(() => of([])),
    );
  }

  /**
   * Add To Server Wishlist
   * 
   * Adds album to server-side wishlist
   *
   * @param albumId Album identifier
   * @return Observable with updated wishlist IDs
   */
  private addToServerWishlist(
    albumId: string,
  ): Observable<{ wishlist: string[] }> {
    return this.http
      .post<ApiResponse<{ wishlist: string[] }>>(
        `${this.apiUrl}/${albumId}`,
        {},
      )
      .pipe(
        map((response) => response.data!),
        tap(() => {
          // Update IDs immediately for UI responsiveness
          const newIds = new Set(this.wishlistIdsSubject.value);
          newIds.add(albumId);
          this.wishlistIdsSubject.next(newIds);

          // Fetch album details in background
          this.http
            .get<ApiResponse<Album>>(`${this.albumsApiUrl}/${albumId}`)
            .pipe(
              map((response) => response.data!),
              catchError(() => of(null)),
            )
            .subscribe((album) => {
              if (album) {
                const currentAlbums = this.wishlistAlbumsSubject.value;
                this.wishlistAlbumsSubject.next([...currentAlbums, album]);
              }
            });
        }),
        catchError(this.handleError),
      );
  }

  /**
   * Remove From Server Wishlist
   * 
   * Removes album from server-side wishlist
   *
   * @param albumId Album identifier
   * @return Observable with updated wishlist IDs
   */
  private removeFromServerWishlist(
    albumId: string,
  ): Observable<{ wishlist: string[] }> {
    return this.http
      .delete<ApiResponse<{ wishlist: string[] }>>(
        `${this.apiUrl}/${albumId}`,
      )
      .pipe(
        map((response) => response.data!),
        tap(() => this.updateAfterRemoval(albumId)),
        catchError(this.handleError),
      );
  }

  /**
   * Add To Local Wishlist
   * 
   * Adds album to localStorage wishlist
   *
   * @param albumId Album identifier
   * @return Observable with updated wishlist IDs
   */
  private addToLocalWishlist(
    albumId: string,
  ): Observable<{ wishlist: string[] }> {
    const wishlistIds = this.getLocalWishlistIds();

    if (!wishlistIds.includes(albumId)) {
      wishlistIds.push(albumId);
      this.saveLocalWishlistIds(wishlistIds);

      const newIds = new Set(this.wishlistIdsSubject.value);
      newIds.add(albumId);
      this.wishlistIdsSubject.next(newIds);

      // Fetch album details
      this.http
        .get<ApiResponse<Album>>(`${this.albumsApiUrl}/${albumId}`)
        .pipe(
          map((response) => response.data!),
          catchError(() => of(null)),
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
   * 
   * Removes album from localStorage wishlist
   *
   * @param albumId Album identifier
   * @return Observable with updated wishlist IDs
   */
  private removeFromLocalWishlist(
    albumId: string,
  ): Observable<{ wishlist: string[] }> {
    let wishlistIds = this.getLocalWishlistIds();
    wishlistIds = wishlistIds.filter((id) => id !== albumId);
    this.saveLocalWishlistIds(wishlistIds);
    this.updateAfterRemoval(albumId);
    return of({ wishlist: wishlistIds });
  }

  /**
   * Update After Removal
   * 
   * Updates state after removing item from wishlist
   *
   * @param albumId Album identifier
   * @return void
   */
  private updateAfterRemoval(albumId: string): void {
    const newIds = new Set(this.wishlistIdsSubject.value);
    newIds.delete(albumId);
    this.wishlistIdsSubject.next(newIds);

    const currentAlbums = this.wishlistAlbumsSubject.value;
    this.wishlistAlbumsSubject.next(
      currentAlbums.filter((album) => album._id !== albumId),
    );
  }

  /**
   * Load Local Wishlist Albums
   * 
   * Fetches album details for localStorage IDs
   *
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

    const albumRequests = localWishlistIds.map((id) =>
      this.http.get<ApiResponse<Album>>(`${this.albumsApiUrl}/${id}`).pipe(
        map((response) => response.data),
        catchError(() => of(null)),
      ),
    );

    if (albumRequests.length > 0) {
      forkJoin(albumRequests).subscribe({
        next: (albums) => {
          const validAlbums = albums.filter(
            (album) => album !== null,
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
   * 
   * Syncs localStorage wishlist to server on login
   *
   * @return Observable of sync operation
   */
  private syncLocalToServer(): Observable<any> {
    const localWishlistIds = this.getLocalWishlistIds();
    if (localWishlistIds.length === 0) return of(null);

    const syncRequests = localWishlistIds.map((albumId) =>
      this.http
        .post<ApiResponse<{ wishlist: string[] }>>(
          `${this.apiUrl}/${albumId}`,
          {},
        )
        .pipe(catchError(() => of(null))),
    );

    return forkJoin(syncRequests).pipe(
      tap(() => this.clearLocalWishlist()),
      catchError(() => of(null)),
    );
  }

  /**
   * Set Item Loading
   * 
   * Updates loading state for specific item
   *
   * @param albumId Album identifier
   * @param isLoading Loading state
   * @return void
   */
  private setItemLoading(albumId: string, isLoading: boolean): void {
    this.itemLoadingStates.set(albumId, isLoading);
    this.itemLoadingSubject.next(new Map(this.itemLoadingStates));
  }

  /**
   * Get Local Wishlist IDs
   * 
   * Retrieves wishlist IDs from localStorage
   *
   * @return Array of album IDs
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
   * 
   * Stores wishlist IDs in localStorage
   *
   * @param wishlistIds Array of album IDs
   * @return void
   */
  private saveLocalWishlistIds(wishlistIds: string[]): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(wishlistIds));
    } catch (error) {
      // Silent fail for localStorage quota issues
    }
  }

  /**
   * Clear Local Wishlist
   * 
   * Removes wishlist from localStorage
   *
   * @return void
   */
  private clearLocalWishlist(): void {
    localStorage.removeItem(this.localStorageKey);
  }

  /**
   * Handle Error
   * 
   * Centralized error handling
   *
   * @param error Error object
   * @return Observable error
   */
  private handleError(error: any): Observable<never> {
    return throwError(() => error);
  }
}