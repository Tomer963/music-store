import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Album, PaginatedResponse, ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  private apiUrl = 'http://localhost:3000/api/v1/albums';

  // Demo albums data - all albums
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
    },
    {
      _id: '4',
      title: 'Back in Black',
      artist: 'AC/DC',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1980,
      price: 27.99,
      stock: 18,
      description: 'The seventh studio album by Australian rock band AC/DC.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/81lF5YmKzOL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '5',
      title: 'The Bodyguard',
      artist: 'Whitney Houston',
      category: { _id: '3', name: 'Soundtrack', isActive: true },
      releaseYear: 1992,
      price: 19.99,
      stock: 30,
      description: 'Soundtrack album from the film of the same name.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/e/e7/The_Bodyguard_%28Whitney_Houston_album_-_cover_art%29.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '6',
      title: 'Rumours',
      artist: 'Fleetwood Mac',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1977,
      price: 28.99,
      stock: 12,
      description: 'The eleventh studio album by British-American rock band Fleetwood Mac.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/71HDa6nThEL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '7',
      title: 'Hotel California',
      artist: 'Eagles',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1976,
      price: 26.99,
      stock: 15,
      description: 'The fifth studio album by American rock band the Eagles.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/4/49/Hotelcalifornia.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '8',
      title: 'Led Zeppelin IV',
      artist: 'Led Zeppelin',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1971,
      price: 31.99,
      stock: 10,
      description: 'The fourth studio album by the English rock band Led Zeppelin.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/2/26/Led_Zeppelin_-_Led_Zeppelin_IV.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '9',
      title: 'The Wall',
      artist: 'Pink Floyd',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1979,
      price: 35.99,
      stock: 8,
      description: 'The eleventh studio album by the English rock band Pink Floyd.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/1/13/PinkFloydWallCoverOriginalNoText.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '10',
      title: 'Purple Rain',
      artist: 'Prince',
      category: { _id: '2', name: 'Pop', isActive: true },
      releaseYear: 1984,
      price: 25.99,
      stock: 20,
      description: 'The sixth studio album by American recording artist Prince.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/9/9c/Princepurplerain.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '11',
      title: 'Born in the U.S.A.',
      artist: 'Bruce Springsteen',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1984,
      price: 23.99,
      stock: 17,
      description: 'The seventh studio album by American rock singer-songwriter Bruce Springsteen.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/3/31/BruceBorn.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '12',
      title: 'Nevermind',
      artist: 'Nirvana',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1991,
      price: 22.99,
      stock: 25,
      description: 'The second studio album by American rock band Nirvana.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/b/b7/NirvanaNevermindalbumcover.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '13',
      title: 'The Joshua Tree',
      artist: 'U2',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1987,
      price: 24.99,
      stock: 14,
      description: 'The fifth studio album by Irish rock band U2.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/71b8wNgVb+L._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '14',
      title: 'Appetite for Destruction',
      artist: "Guns N' Roses",
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1987,
      price: 26.99,
      stock: 19,
      description: "The debut studio album by American hard rock band Guns N' Roses.",
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/6/60/GunsnRosesAppetiteforDestructionalbumcover.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '15',
      title: 'Sgt. Pepper\'s Lonely Hearts Club Band',
      artist: 'The Beatles',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1967,
      price: 32.99,
      stock: 11,
      description: 'The eighth studio album by the English rock band the Beatles.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/5/50/Sgt._Pepper%27s_Lonely_Hearts_Club_Band.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '16',
      title: 'Kind of Blue',
      artist: 'Miles Davis',
      category: { _id: '4', name: 'Jazz', isActive: true },
      releaseYear: 1959,
      price: 29.99,
      stock: 16,
      description: 'A studio album by American jazz trumpeter Miles Davis.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/9/9c/MilesDavisKindofBlue.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '17',
      title: 'A Love Supreme',
      artist: 'John Coltrane',
      category: { _id: '4', name: 'Jazz', isActive: true },
      releaseYear: 1965,
      price: 27.99,
      stock: 13,
      description: 'A studio album by American jazz saxophonist John Coltrane.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/9/9a/John_Coltrane_-_A_Love_Supreme.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '18',
      title: 'The Chronic',
      artist: 'Dr. Dre',
      category: { _id: '5', name: 'Hip Hop', isActive: true },
      releaseYear: 1992,
      price: 21.99,
      stock: 22,
      description: 'The debut studio album by American hip hop producer and rapper Dr. Dre.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/1/19/Dr.DreTheChronic.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '19',
      title: 'Ready to Die',
      artist: 'The Notorious B.I.G.',
      category: { _id: '5', name: 'Hip Hop', isActive: true },
      releaseYear: 1994,
      price: 23.99,
      stock: 18,
      description: 'The debut studio album by American rapper The Notorious B.I.G.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/c/c3/NotoriousBIGReadyToDie.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '20',
      title: 'OK Computer',
      artist: 'Radiohead',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1997,
      price: 28.99,
      stock: 21,
      description: 'The third studio album by English rock band Radiohead.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/71JJ6OgC7VL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '21',
      title: 'The Queen Is Dead',
      artist: 'The Smiths',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1986,
      price: 25.99,
      stock: 0,
      description: 'The third studio album by English rock band the Smiths.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/71mHFGj1PLL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: false,
      inStock: false
    },
    {
      _id: '22',
      title: 'Blue',
      artist: 'Joni Mitchell',
      category: { _id: '6', name: 'Folk', isActive: true },
      releaseYear: 1971,
      price: 24.99,
      stock: 14,
      description: 'The fourth studio album by Canadian singer-songwriter Joni Mitchell.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/e/e3/JoniMitchellBluealbumcover.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    },
    {
      _id: '23',
      title: 'London Calling',
      artist: 'The Clash',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 1979,
      price: 30.99,
      stock: 16,
      description: 'The third studio album by English rock band the Clash.',
      images: [
        { url: 'https://upload.wikimedia.org/wikipedia/en/0/00/TheClashLondonCallingalbumcover.jpg', isMain: true }
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
      _id: '26',
      title: 'Whatever People Say I Am, That\'s What I\'m Not',
      artist: 'Arctic Monkeys',
      category: { _id: '1', name: 'Rock', isActive: true },
      releaseYear: 2006,
      price: 23.99,
      stock: 20,
      description: 'The debut studio album by English rock band Arctic Monkeys.',
      images: [
        { url: 'https://m.media-amazon.com/images/I/71lUOcXx0gL._UF1000,1000_QL80_.jpg', isMain: true }
      ],
      availability: true,
      inStock: true
    }
  ];

  constructor(private http: HttpClient) {
    console.log('AlbumService constructor - service initialized');
  }

  getNewAlbums(): Observable<Album[]> {
    console.log('getNewAlbums called, returning', this.demoAlbums.length, 'albums');
    return of([...this.demoAlbums]);
  }

  getAlbums(page: number, limit: number): Observable<PaginatedResponse<Album>> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAlbums = this.demoAlbums.slice(startIndex, endIndex);
    
    return of({ 
      success: true, 
      message: 'Albums retrieved successfully', 
      data: { 
        results: paginatedAlbums, 
        pagination: { 
          page: page, 
          limit: limit, 
          total: this.demoAlbums.length, 
          pages: Math.ceil(this.demoAlbums.length / limit) 
        } 
      } 
    });
  }

  getAlbum(id: string): Observable<Album> {
    const album = this.demoAlbums.find(a => a._id === id);
    if (album) {
      return of(album);
    }
    throw new Error('Album not found');
  }

  searchAlbums(query: string): Observable<Album[]> {
    console.log('Searching for:', query);
    const searchTerm = query.toLowerCase();
    const results = this.demoAlbums.filter(album => 
      album.title.toLowerCase().includes(searchTerm) ||
      album.artist.toLowerCase().includes(searchTerm)
    );
    console.log('Search results:', results.length);
    return of(results);
  }

  getAlbumsByCategory(categoryId: string, page: number = 1, limit: number = 12): Observable<PaginatedResponse<Album>> {
    console.log('Getting albums for category:', categoryId, 'page:', page);
    
    // Filter albums by category
    const filteredAlbums = this.demoAlbums.filter(album => {
      if (typeof album.category === 'object') {
        return album.category._id === categoryId;
      }
      return album.category === categoryId;
    });
    
    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAlbums = filteredAlbums.slice(startIndex, endIndex);
    
    console.log('Found', filteredAlbums.length, 'albums in category');
    
    return of({
      success: true,
      message: 'Albums retrieved successfully',
      data: {
        results: paginatedAlbums,
        pagination: {
          page: page,
          limit: limit,
          total: filteredAlbums.length,
          pages: Math.ceil(filteredAlbums.length / limit)
        }
      }
    });
  }

  getMainImageUrl(album: Album): string {
    return album.images?.[0]?.url || 'https://via.placeholder.com/300';
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}