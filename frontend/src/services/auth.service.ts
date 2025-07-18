import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { User, AuthResponse, LoginCredentials, RegistrationData, TokenPayload } from '../models/user.model';
import { ApiResponse } from '../models/album.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = environment.tokenKey;

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Initialize authentication state on app startup
   */
  initializeAuth(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired(token)) {
      // Only try to load profile if we have a valid token
      this.loadUserProfile();
    } else {
      // Clear any invalid token
      this.clearAuth();
    }
  }

  /**
   * Register a new user
   * @param data Registration data
   * @returns Observable of auth response
   */
  register(data: RegistrationData): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, data)
      .pipe(
        map((response) => response.data!),
        tap((authData) => {
          this.setAuthData(authData);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Login user
   * @param credentials Login credentials
   * @returns Observable of auth response
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, credentials)
      .pipe(
        map((response) => response.data!),
        tap((authData) => {
          this.setAuthData(authData);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Logout user
   */
  logout(): void {
    // Clear local auth first
    this.clearAuth();
    
    // Then notify the server (but don't wait for response)
    this.http.get(`${this.apiUrl}/logout`).subscribe({
      complete: () => {
        this.router.navigate(['/']);
      },
      error: () => {
        // Still navigate even if logout endpoint fails
        this.router.navigate(['/']);
      }
    });
  }

  /**
   * Get current user profile
   * @returns Observable of user
   */
  getProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/profile`).pipe(
      map((response) => response.data!),
      tap((user) => {
        this.currentUserSubject.next(user);
      }),
      catchError((error) => {
        // If profile fetch fails, clear auth
        this.clearAuth();
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if user is authenticated
   * @returns true if authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  /**
   * Get current user value
   * @returns Current user or null
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get authentication token
   * @returns Token or null
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set authentication data
   * @param authData Authentication response data
   */
  private setAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authData.token);
    this.currentUserSubject.next(authData.user);
  }

  /**
   * Clear authentication data
   */
  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  /**
   * Load user profile
   */
  private loadUserProfile(): void {
    this.getProfile().subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
      },
      error: (error) => {
        console.warn('Failed to load user profile:', error);
        // Don't clear auth here - token might still be valid
        // Let the error interceptor handle 401s
      }
    });
  }

  /**
   * Check if token is expired
   * @param token JWT token
   * @returns true if expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch {
      return true;
    }
  }

  /**
   * Decode JWT token
   * @param token JWT token
   * @returns Token payload
   */
  private decodeToken(token: string): TokenPayload {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  /**
   * Handle HTTP errors
   * @param error HTTP error response
   * @returns Observable error
   */
  private handleError(error: any): Observable<never> {
    console.error('Auth error:', error);
    
    // Extract error details
    let errorDetails = {
      status: error.status,
      message: error.error?.message || error.message || 'An error occurred',
      error: error.error
    };
    
    return throwError(() => errorDetails);
  }
}