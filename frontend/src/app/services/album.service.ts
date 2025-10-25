import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { Album, PaginatedResponse, ApiResponse } from "../models/album.model";
import { HttpErrorHandlerService } from "./http-error-handler.service";

@Injectable({
  providedIn: "root",
})
export class AlbumService {
  private apiUrl = `${environment.apiUrl}/albums`;
  private readonly placeholderBase64 =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmMGYwZjAiLz4KICAKICA8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxNTAiIHI9IjEyMCIgZmlsbD0iIzFhMWExYSIvPgogIDxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iMTAwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMzMzMiIHN0cm9rZS13aWR0aD0iMSIvPgogIDxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMzMzMyIgc3Ryb2tlLXdpZHRoPSIxIi8+CiAgPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSI2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzMzMzIiBzdHJva2Utd2lkdGg9IjEiLz4KICAKICA8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxNTAiIHI9IjQwIiBmaWxsPSIjZmYwMDAwIi8+CiAgPGNpcmNsZSBjeD0iMTUwIiBjeT0iMTUwIiByPSI1IiBmaWxsPSIjMWExYTFhIi8+CiAgCiAgPHRleHQgeD0iMTUwIiB5PSIxNTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5NVVNJQzwvdGV4dD4KPC9zdmc+";

  constructor(
    private http: HttpClient,
    private errorHandler: HttpErrorHandlerService
  ) {}

  /**
   * Get Albums
   *
   * Fetches paginated list of albums
   *
   * @param page - Page number
   * @param limit - Items per page
   * @param sort - Sort order
   * @return Paginated albums response
   */
  getAlbums(
    page = 1,
    limit = 12,
    sort = "-createdAt"
  ): Observable<PaginatedResponse<Album>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString())
      .set("sort", sort);

    return this.http
      .get<PaginatedResponse<Album>>(this.apiUrl, { params })
      .pipe(
        catchError((error) =>
          this.errorHandler.handleError(error, "AlbumService.getAlbums")
        )
      );
  }

  /**
   * Get Album
   *
   * Fetches single album by ID
   *
   * @param id - Album ID
   * @return Album data
   */
  getAlbum(id: string): Observable<Album> {
    return this.http.get<ApiResponse<Album>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError((error) =>
        this.errorHandler.handleError(error, "AlbumService.getAlbum")
      )
    );
  }

  /**
   * Get New Albums
   *
   * Fetches newest albums
   *
   * @param page - Page number
   * @param limit - Items per page
   * @return Paginated new albums
   */
  getNewAlbums(page = 1, limit = 23): Observable<any> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString());

    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/new`, { params })
      .pipe(
        map(
          (response) =>
            response.data || {
              results: [],
              pagination: { page: 1, limit, total: 0, pages: 1 },
            }
        ),
        catchError((error) =>
          this.errorHandler.handleError(error, "AlbumService.getNewAlbums")
        )
      );
  }

  /**
   * Search Albums
   *
   * Searches albums by query string
   *
   * @param query - Search query
   * @return Array of matching albums
   */
  searchAlbums(query: string): Observable<Album[]> {
    const params = new HttpParams().set("q", query);
    return this.http
      .get<ApiResponse<Album[]>>(`${this.apiUrl}/search`, { params })
      .pipe(
        map((response) => response.data || []),
        catchError((error) =>
          this.errorHandler.handleError(error, "AlbumService.searchAlbums")
        )
      );
  }

  /**
   * Get Albums By Category
   *
   * Fetches albums filtered by category
   *
   * @param categoryId - Category ID
   * @param page - Page number
   * @param limit - Items per page
   * @return Paginated albums response
   */
  getAlbumsByCategory(
    categoryId: string,
    page = 1,
    limit = 12
  ): Observable<PaginatedResponse<Album>> {
    const params = new HttpParams()
      .set("page", page.toString())
      .set("limit", limit.toString())
      .set("category", categoryId)
      .set("sort", "-createdAt");

    return this.http
      .get<PaginatedResponse<Album>>(this.apiUrl, { params })
      .pipe(
        catchError((error) =>
          this.errorHandler.handleError(
            error,
            "AlbumService.getAlbumsByCategory"
          )
        )
      );
  }

  /**
   * Get Main Image URL
   *
   * Retrieves main album image or returns placeholder
   *
   * @param album - Album object
   * @return Image URL
   */
  getMainImageUrl(album: Album): string {
    if (!album.images || album.images.length === 0) {
      return this.placeholderBase64;
    }

    // Try to find main image
    const mainImage = album.images.find((img) => img.isMain === true);
    if (mainImage?.url && !mainImage.url.includes("placeholder")) {
      return mainImage.url;
    }

    // Fallback to first image
    if (album.images[0]?.url && !album.images[0].url.includes("placeholder")) {
      return album.images[0].url;
    }

    return this.placeholderBase64;
  }

  /**
   * Format Price
   *
   * Formats price with currency symbol
   *
   * @param price - Price value
   * @return Formatted price string
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}
