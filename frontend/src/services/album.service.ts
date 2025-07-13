import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { Album, PaginatedResponse, ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  private apiUrl = `${environment.apiUrl}/albums`;

  constructor(private http: HttpClient) {}

  getNewAlbums(): Observable<Album[]> {
    return this.http.get<ApiResponse<Album[]>>(`${this.apiUrl}/new`).pipe(
      map((response) => response.data || []),
      catchError((error) => {
        console.error('Failed to load albums:', error);
        // Return mock data for development
        return of(this.getMockAlbums());
      })
    );
  }

  getAlbums(page: number, limit: number): Observable<PaginatedResponse<Album>> {
    return this.http.get<PaginatedResponse<Album>>(this.apiUrl).pipe(
      catchError((error) => {
        console.error('Failed to load albums:', error);
        // Return mock data for development
        return of({ 
          success: true, 
          message: '', 
          data: { 
            results: this.getMockAlbums().slice((page - 1) * limit, page * limit), 
            pagination: { page, limit, total: 50, pages: 5 } 
          } 
        });
      })
    );
  }

  getMainImageUrl(album: Album): string {
    return album.images?.[0]?.url || 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(album.title);
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  private getMockAlbums(): Album[] {
    return [
      {
        _id: '1',
        title: 'The Dark Side of the Moon',
        artist: 'Pink Floyd',
        category: '1',
        releaseYear: 1973,
        price: 29.99,
        stock: 15,
        description: 'One of the best-selling albums of all time',
        images: [{ url: 'https://via.placeholder.com/300x300/FF6B6B/FFFFFF?text=Dark+Side', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '2',
        title: 'Thriller',
        artist: 'Michael Jackson',
        category: '2',
        releaseYear: 1982,
        price: 24.99,
        stock: 20,
        description: 'The best-selling album of all time',
        images: [{ url: 'https://via.placeholder.com/300x300/4ECDC4/FFFFFF?text=Thriller', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '3',
        title: 'Kind of Blue',
        artist: 'Miles Davis',
        category: '3',
        releaseYear: 1959,
        price: 19.99,
        stock: 10,
        description: 'The best-selling jazz album of all time',
        images: [{ url: 'https://via.placeholder.com/300x300/45B7D1/FFFFFF?text=Kind+of+Blue', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '4',
        title: 'Abbey Road',
        artist: 'The Beatles',
        category: '1',
        releaseYear: 1969,
        price: 27.99,
        stock: 12,
        description: 'The Beatles\' best-selling album',
        images: [{ url: 'https://via.placeholder.com/300x300/96CEB4/FFFFFF?text=Abbey+Road', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '5',
        title: 'Rumours',
        artist: 'Fleetwood Mac',
        category: '1',
        releaseYear: 1977,
        price: 22.99,
        stock: 8,
        description: 'One of the best-selling albums of all time',
        images: [{ url: 'https://via.placeholder.com/300x300/FFEAA7/333333?text=Rumours', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '6',
        title: 'The Wall',
        artist: 'Pink Floyd',
        category: '1',
        releaseYear: 1979,
        price: 32.99,
        stock: 0,
        description: 'A rock opera double album',
        images: [{ url: 'https://via.placeholder.com/300x300/DFE6E9/2D3436?text=The+Wall', isMain: true }],
        availability: false,
        inStock: false
      },
      {
        _id: '7',
        title: 'Back in Black',
        artist: 'AC/DC',
        category: '1',
        releaseYear: 1980,
        price: 26.99,
        stock: 18,
        description: 'One of the best-selling albums by a band',
        images: [{ url: 'https://via.placeholder.com/300x300/2D3436/FFFFFF?text=Back+in+Black', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '8',
        title: 'The Joshua Tree',
        artist: 'U2',
        category: '1',
        releaseYear: 1987,
        price: 21.99,
        stock: 14,
        description: 'U2\'s most successful album',
        images: [{ url: 'https://via.placeholder.com/300x300/74B9FF/FFFFFF?text=Joshua+Tree', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '9',
        title: 'Born in the U.S.A.',
        artist: 'Bruce Springsteen',
        category: '1',
        releaseYear: 1984,
        price: 23.99,
        stock: 11,
        description: 'Springsteen\'s most successful album',
        images: [{ url: 'https://via.placeholder.com/300x300/A29BFE/FFFFFF?text=Born+USA', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '10',
        title: 'Purple Rain',
        artist: 'Prince',
        category: '2',
        releaseYear: 1984,
        price: 25.99,
        stock: 9,
        description: 'Prince\'s signature album',
        images: [{ url: 'https://via.placeholder.com/300x300/6C5CE7/FFFFFF?text=Purple+Rain', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '11',
        title: 'Led Zeppelin IV',
        artist: 'Led Zeppelin',
        category: '1',
        releaseYear: 1971,
        price: 28.99,
        stock: 16,
        description: 'Contains "Stairway to Heaven"',
        images: [{ url: 'https://via.placeholder.com/300x300/FDCB6E/333333?text=Led+Zep+IV', isMain: true }],
        availability: true,
        inStock: true
      },
      {
        _id: '12',
        title: 'The Beatles (White Album)',
        artist: 'The Beatles',
        category: '1',
        releaseYear: 1968,
        price: 34.99,
        stock: 7,
        description: 'The Beatles\' ninth studio album',
        images: [{ url: 'https://via.placeholder.com/300x300/FFFFFF/333333?text=White+Album', isMain: true }],
        availability: true,
        inStock: true
      }
    ];
  }
}