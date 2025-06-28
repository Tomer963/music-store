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

export interface AlbumImage {
  url: string;
  isMain: boolean;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  albumCount?: number;
}

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

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}