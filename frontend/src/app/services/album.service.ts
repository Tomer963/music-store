import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Album, PaginatedResponse, ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  private apiUrl = `${environment.apiUrl}/albums`;

  constructor(private http: HttpClient) {}

  getNewAlbums(): Observable<Album[]> {
    // TODO: Implement
    return of([]);
  }

  getAlbums(page: number, limit: number): Observable<PaginatedResponse<Album>> {
    // TODO: Implement
    return of({ 
      success: true, 
      message: '', 
      data: { 
        results: [], 
        pagination: { page: 1, limit: 12, total: 0, pages: 0 } 
      } 
    });
  }

  getMainImageUrl(album: Album): string {
    return album.images?.[0]?.url || '/assets/images/placeholder.jpg';
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}