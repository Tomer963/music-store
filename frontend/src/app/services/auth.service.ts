import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { User, AuthResponse, LoginCredentials, RegistrationData } from '../models/user.model';
import { ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/v1/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = 'music_store_token';
  private userKey = 'music_store_user';

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Initialize authentication state on app startup
   */
  initializeAuth(): void {
    const token = this.getToken();
    const userStr = localStorage.getItem(this.userKey);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (error) {
        this.clearAuth();
      }
    } else {
      this.clearAuth();
    }
  }

  /**
   * Check if user is authenticated
   * @returns true if authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null && this.currentUserSubject.value !== null;
  }

  /**
   * Get authentication token
   * @returns Token or null
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get current user value
   * @returns Current user or null
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Login user (Demo implementation)
   * @param credentials Login credentials
   * @returns Observable of auth response
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // For demo purposes
    const demoUser: User = {
      id: '1',
      email: credentials.email,
      firstName: 'Demo',
      lastName: 'User',
      role: 'user'
    };
    
    const authResponse: AuthResponse = {
      user: demoUser,
      token: 'demo-token-' + Date.now()
    };
    
    this.setAuthData(authResponse);
    return of(authResponse);
  }

  /**
   * Register user (Demo implementation)
   * @param data Registration data
   * @returns Observable of auth response
   */
  register(data: RegistrationData): Observable<AuthResponse> {
    // For demo purposes
    const demoUser: User = {
      id: Date.now().toString(),
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: 'user'
    };
    
    const authResponse: AuthResponse = {
      user: demoUser,
      token: 'demo-token-' + Date.now()
    };
    
    this.setAuthData(authResponse);
    return of(authResponse);
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearAuth();
    this.router.navigate(['/']);
  }

  /**
   * Set authentication data
   * @param authData Authentication response data
   */
  private setAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authData.token);
    localStorage.setItem(this.userKey, JSON.stringify(authData.user));
    this.currentUserSubject.next(authData.user);
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }
}