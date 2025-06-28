export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin';
  wishlist?: string[];
  billingInfo?: BillingInfo;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingInfo {
  address: string;
  city: string;
  zipCode: string;
  phone: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}