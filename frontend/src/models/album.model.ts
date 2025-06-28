/**
 * Album model interface
 * Represents a music album in the store
 */
export interface Album {
  _id: string;
  title: string;
  artist: string;
  category: Category | string;
  releaseYear: number;
  price: number;
  stock: number;
  description: string;
  longDescription?: string;
  images: AlbumImage[];
  availability: boolean;
  inStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Album image interface
 */
export interface AlbumImage {
  url: string;
  isMain: boolean;
}

/**
 * Category interface
 */
export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  albumCount?: number;
}

/**
 * API response interface for paginated results
 */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    results: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/**
 * API response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

/**
 * Search result interface
 */
export interface SearchResult {
  albums: Album[];
  query: string;
  total: number;
}
