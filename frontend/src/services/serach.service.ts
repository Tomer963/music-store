import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Album } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = 'http://localhost:3000/api/v1/albums/search';

  // Demo albums for search
  private demoAlbums: Album[] = [
    {
      _id: '1',
      title: 'Abbey Road',
      artist: 'The Beatles',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1969,
      price: 29.99,
      stock: 15,
      description: 'The eleventh studio album by the English rock band the Beatles.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/4/42/Beatles_-_Abbey_Road.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '24',
      title: 'AM',
      artist: 'Arctic Monkeys',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 2013,
      price: 26.99,
      stock: 25,
      description: 'The fifth studio album by English rock band Arctic Monkeys.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/81CmT0rb9gL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '25',
      title: 'Favourite Worst Nightmare',
      artist: 'Arctic Monkeys',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 2007,
      price: 24.99,
      stock: 18,
      description: 'The second studio album by English rock band Arctic Monkeys.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/71Tw8q2DUJL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '2',
      title: 'The Dark Side of the Moon',
      artist: 'Pink Floyd',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1973,
      price: 34.99,
      stock: 20,
      description: 'The eighth studio album by the English rock band Pink Floyd.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Dark_Side_of_the_Moon.png', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '3',
      title: 'Thriller',
      artist: 'Michael Jackson',
      category: { _id: '2', name: 'Pop', isActive: true },
      releaseYear: 1982,
      price: 24.99,
      stock: 25,
      description: 'The sixth studio album by American singer Michael Jackson.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/5/55/Michael_Jackson_-_Thriller.png', isMain: true }
      ],
      availability: true,
      inStock: true
    }
  ];

  constructor(private http: HttpClient) {
    console.log('SearchService initialized');
  }

  searchAlbums(query: string): Observable<Album[]> {
    console.log('searchAlbums called with query:', query);
    
    if (!query || query.trim().length < 3) {
      return of([]);
    }
    
    const searchTerm = query.toLowerCase().trim();
    const results = this.demoAlbums.filter(album => 
      album.title.toLowerCase().includes(searchTerm) ||
      album.artist.toLowerCase().includes(searchTerm)
    );
    
    console.log('Search results:', results.length, 'albums found');
    return of(results);
  }
}