import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Category, ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;

  constructor(private http: HttpClient) {}

  /**
   * Get all categories
   * @returns Observable of categories array
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(this.apiUrl).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Failed to load categories:', error);
        // Return mock data for development
        return of([
          { _id: '1', name: 'Rock', isActive: true, albumCount: 45 },
          { _id: '2', name: 'Pop', isActive: true, albumCount: 38 },
          { _id: '3', name: 'Jazz', isActive: true, albumCount: 27 },
          { _id: '4', name: 'Classical', isActive: true, albumCount: 31 },
          { _id: '5', name: 'Hip Hop', isActive: true, albumCount: 22 },
          { _id: '6', name: 'Electronic', isActive: true, albumCount: 19 },
          { _id: '7', name: 'Country', isActive: true, albumCount: 24 },
          { _id: '8', name: 'R&B', isActive: true, albumCount: 18 }
        ]);
      })
    );
  }

  /**
   * Get category by ID
   * @param id Category ID
   * @returns Observable of category
   */
  getCategory(id: string): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => response.data!),
      catchError((error) => {
        console.error('Failed to load category:', error);
        throw error;
      })
    );
  }
}