/**
 * Cart model interfaces
 */

import { Album } from "./album.model";

/**
 * Cart item interface
 */
export interface CartItem {
  _id: string;
  album: Album;
  quantity: number;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Cart interface
 */
export interface Cart {
  items: CartItem[];
  itemCount: number;
  total: number;
}

/**
 * Add to cart request interface
 */
export interface AddToCartRequest {
  albumId: string;
  quantity: number;
}

/**
 * Update cart item request interface
 */
export interface UpdateCartItemRequest {
  quantity: number;
}

/**
 * Cart response interface
 */
export interface CartResponse {
  item?: CartItem;
  sessionId?: string;
}
