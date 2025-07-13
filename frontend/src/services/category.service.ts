import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { Category } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'http://localhost:3000/api/v1/categories';

  constructor(private http: HttpClient) {
    console.log('CategoryService initialized');
  }

  getCategories(): Observable<Category[]> {
    console.log('getCategories called');
    
    const categories: Category[] = [
      { _id: '1', name: 'Rock', isActive: true, albumCount: 14 },
      { _id: '2', name: 'Pop', isActive: true, albumCount: 2 },
      { _id: '3', name: 'Soundtrack', isActive: true, albumCount: 1 },
      { _id: '4', name: 'Jazz', isActive: true, albumCount: 2 },
      { _id: '5', name: 'Hip Hop', isActive: true, albumCount: 2 },
      { _id: '6', name: 'Folk', isActive: true, albumCount: 1 },
      { _id: '7', name: 'Classical', isActive: true, albumCount: 0 },
      { _id: '8', name: 'Electronic', isActive: true, albumCount: 0 }
    ];
    
    console.log('Returning categories:', categories.length);
    return of(categories);
  }

  getCategory(id: string): Observable<Category> {
    console.log('getCategory called with id:', id);
    
    const categories: Category[] = [
      { _id: '1', name: 'Rock', isActive: true, albumCount: 14 },
      { _id: '2', name: 'Pop', isActive: true, albumCount: 2 },
      { _id: '3', name: 'Soundtrack', isActive: true, albumCount: 1 },
      { _id: '4', name: 'Jazz', isActive: true, albumCount: 2 },
      { _id: '5', name: 'Hip Hop', isActive: true, albumCount: 2 },
      { _id: '6', name: 'Folk', isActive: true, albumCount: 1 }
    ];
    
    const category = categories.find(c => c._id === id);
    if (category) {
      return of(category);
    }
    
    // Return a default category if not found
    return of({ _id: id, name: 'Unknown Category', isActive: true });
  }
}