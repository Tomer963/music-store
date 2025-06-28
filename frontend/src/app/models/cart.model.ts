import { Album } from './album.model';

export interface CartItem {
  _id: string;
  album: Album;
  quantity: number;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  total: number;
}

export interface AddToCartRequest {
  albumId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CartResponse {
  item?: CartItem;
  sessionId?: string;
}