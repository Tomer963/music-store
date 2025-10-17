import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Album, ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class SearchService {
  private apiUrl = `${environment.apiUrl}/albums/search`;
  private cache = new Map<string, Album[]>(); // Cache for search results
  private readonly MAX_CACHE_SIZE = 50;
  private readonly MIN_QUERY_LENGTH = 3;

  constructor(private http: HttpClient) {}

  /**
   * Search Albums
   * Search for albums with client-side caching to reduce API calls
   * @param query Search query string
   * @return Observable<Album[]> Array of matching albums
   */
  searchAlbums(query: string): Observable<Album[]> {
    const trimmedQuery = query.trim();

    // Validate minimum query length
    if (trimmedQuery.length < this.MIN_QUERY_LENGTH) {
      return of([]);
    }

    // Check cache first to avoid unnecessary API calls
    if (this.cache.has(trimmedQuery)) {
      return of(this.cache.get(trimmedQuery)!);
    }

    const params = new HttpParams().set("q", trimmedQuery);

    return this.http.get<ApiResponse<Album[]>>(this.apiUrl, { params }).pipe(
      map((response) => {
        const albums = response.data || [];
        this.cacheResults(trimmedQuery, albums);
        return albums;
      }),
      catchError((error) => {
        console.error("Search error:", error);
        return of([]);
      })
    );
  }

  /**
   * Clear Cache
   * Clears all cached search results
   * @return void
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cache Results
   * Store search results with LRU-style eviction
   * @param key Cache key (search query)
   * @param albums Albums to cache
   * @return void
   */
  private cacheResults(key: string, albums: Album[]): void {
    this.cache.set(key, albums);

    // Implement simple LRU: remove oldest entry if cache is full
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }
}
