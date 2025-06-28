/**
 * Order model interfaces
 */

import { Album } from "./album.model";
import { User, BillingInfo } from "./user.model";

/**
 * Order item interface
 */
export interface OrderItem {
  album: Album | string;
  quantity: number;
  price: number;
}

/**
 * Order interface
 */
export interface Order {
  _id: string;
  user: User | string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentInfo: PaymentInfo;
  billingInfo: BillingInfo;
  orderNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Order status enum
 */
export enum OrderStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}

/**
 * Payment method enum
 */
export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  CHECK = "check",
}

/**
 * Payment information interface
 */
export interface PaymentInfo {
  // For credit card
  cardType?: "visa" | "mastercard" | "direct";
  lastFourDigits?: string;
  // For check
  checkNumber?: string;
}

/**
 * Credit card information interface
 */
export interface CreditCardInfo {
  cardType: "visa" | "mastercard" | "direct";
  cardNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

/**
 * Create order request interface
 */
export interface CreateOrderRequest {
  paymentMethod: PaymentMethod;
  paymentInfo: CreditCardInfo | { checkNumber: string };
  billingInfo: BillingInfo;
}

/**
 * Checkout step enum
 */
export enum CheckoutStep {
  BILLING = 1,
  PAYMENT = 2,
  REVIEW = 3,
}
