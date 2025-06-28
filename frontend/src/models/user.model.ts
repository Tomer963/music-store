/**
 * User model interfaces
 */

/**
 * User interface
 */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "user" | "admin";
  wishlist?: string[];
  billingInfo?: BillingInfo;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Billing information interface
 */
export interface BillingInfo {
  address: string;
  city: string;
  zipCode: string;
  phone: string;
}

/**
 * Authentication response interface
 */
export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data interface
 */
export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Token payload interface
 */
export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
