import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Album } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = `${environment.apiUrl}/albums/search`;

  constructor(private http: HttpClient) {}

  searchAlbums(query: string): Observable<Album[]> {
    // TODO: Implement
    return of([]);
  }
}