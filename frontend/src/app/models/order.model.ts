import { Album } from './album.model';
import { User, BillingInfo } from './user.model';

export interface OrderItem {
  album: Album | string;
  quantity: number;
  price: number;
}

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

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  CHECK = 'check'
}

export interface PaymentInfo {
  cardType?: 'visa' | 'mastercard' | 'direct';
  lastFourDigits?: string;
  checkNumber?: string;
}

export interface CreditCardInfo {
  cardType: 'visa' | 'mastercard' | 'direct';
  cardNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

export interface CreateOrderRequest {
  paymentMethod: PaymentMethod;
  paymentInfo: CreditCardInfo | { checkNumber: string };
  billingInfo: BillingInfo;
}

export enum CheckoutStep {
  BILLING = 1,
  PAYMENT = 2,
  REVIEW = 3
}