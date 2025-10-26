import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import {
  BehaviorSubject,
  Observable,
  throwError,
  interval,
  fromEvent,
  merge,
} from "rxjs";
import { tap, catchError, map, throttleTime, take } from "rxjs/operators";
import { environment } from "../../environments/environment";
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegistrationData,
  TokenPayload,
} from "../models/user.model";
import { ApiResponse } from "../models/album.model";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private tokenKey = environment.tokenKey;
  private returnUrlKey = "auth_return_url";
  private lastActivityKey = "last_activity_timestamp";
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

  constructor(private http: HttpClient, private router: Router) {
    this.setupActivityTracking();
    this.setupInactivityCheck();
  }

  /**
   * Setup Activity Tracking
   * Monitors user interactions to track session activity
   * 
   * @return (void)
   */
  private setupActivityTracking(): void {
    // Combine multiple user activity events
    const userActivity$ = merge(
      fromEvent(document, "mousemove"),
      fromEvent(document, "mousedown"),
      fromEvent(document, "keypress"),
      fromEvent(document, "scroll"),
      fromEvent(document, "touchstart")
    ).pipe(throttleTime(5000));

    userActivity$.subscribe(() => {
      if (this.isAuthenticated()) {
        this.updateLastActivity();
      }
    });
  }

  /**
   * Setup Inactivity Check
   * Periodically checks for session timeout
   * 
   * @return (void)
   */
  private setupInactivityCheck(): void {
    interval(this.ACTIVITY_CHECK_INTERVAL).subscribe(() => {
      if (this.isAuthenticated()) {
        const lastActivity = this.getLastActivity();
        const now = Date.now();

        // Logout if inactivity exceeds timeout
        if (lastActivity && now - lastActivity > this.INACTIVITY_TIMEOUT) {
          this.handleSessionExpiry();
        }
      }
    });
  }

  /**
   * Update Last Activity
   * Records current timestamp as last user activity
   * 
   * @return (void)
   */
  private updateLastActivity(): void {
    localStorage.setItem(this.lastActivityKey, Date.now().toString());
  }

  /**
   * Get Last Activity
   * Retrieves timestamp of last user activity
   * 
   * @return (number | null) Timestamp or null
   */
  private getLastActivity(): number | null {
    const timestamp = localStorage.getItem(this.lastActivityKey);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  /**
   * Handle Session Expiry
   * Clears auth data and redirects to home
   * 
   * @return (void)
   */
  private handleSessionExpiry(): void {
    this.clearAuth();
    this.router.navigate(["/"], {
      queryParams: { sessionExpired: "true" },
    });
  }

  /**
   * Initialize Auth
   * Restores user session on app startup
   * 
   * @return (void)
   */
  initializeAuth(): void {
    const token = this.getToken();

    if (token && !this.isTokenExpired(token)) {
      const lastActivity = this.getLastActivity();
      const now = Date.now();

      // Check for session timeout
      if (lastActivity && now - lastActivity > this.INACTIVITY_TIMEOUT) {
        this.clearAuth();
        return;
      }

      try {
        const payload = this.decodeToken(token);

        // Create user object from token
        const user: User = {
          _id: payload.id,
          email: payload.email,
          firstName: "",
          lastName: "",
          role: payload.role as "user" | "admin",
          wishlist: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.currentUserSubject.next(user);
        this.updateLastActivity();

        // Fetch complete profile in background
        this.loadUserProfile();
      } catch (error) {
        this.clearAuth();
      }
    } else {
      this.clearAuth();
    }
  }

  /**
   * Register
   * Creates new user account
   * 
   * @param (RegistrationData) data - User registration information
   * @return (Observable<AuthResponse>) Authentication response with token
   */
  register(data: RegistrationData): Observable<AuthResponse> {
    const sessionId = localStorage.getItem(environment.sessionIdKey);
    const requestData = sessionId ? { ...data, sessionId } : data;

    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, requestData)
      .pipe(
        map((response) => response.data!),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Login
   * Authenticates user and stores session
   * 
   * @param (LoginCredentials) credentials - Email and password
   * @return (Observable<AuthResponse>) Authentication response with token
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const sessionId = localStorage.getItem(environment.sessionIdKey);
    const requestData = sessionId ? { ...credentials, sessionId } : credentials;

    return this.http
      .post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, requestData)
      .pipe(
        map((response) => response.data!),
        tap((authData) => {
          this.setAuthData(authData);
          this.updateLastActivity();
        }),
        catchError((error) => this.handleError(error))
      );
  }

  /**
   * Save Return URL
   * Stores URL to redirect after login
   * 
   * @param (string) url - URL to return to
   * @return (void)
   */
  saveReturnUrl(url: string): void {
    if (url && url !== "/login" && url !== "/") {
      sessionStorage.setItem(this.returnUrlKey, url);
    }
  }

  /**
   * Get Return URL
   * Retrieves saved return URL
   * 
   * @return (string | null) Saved URL or null
   */
  getReturnUrl(): string | null {
    return sessionStorage.getItem(this.returnUrlKey);
  }

  /**
   * Clear Return URL
   * Removes saved return URL
   * 
   * @return (void)
   */
  clearReturnUrl(): void {
    sessionStorage.removeItem(this.returnUrlKey);
  }

  /**
   * Logout
   * Clears user session
   * 
   * @return (void)
   */
  logout(): void {
    const token = this.getToken();
    this.clearAuth();

    // Notify server of logout
    if (token) {
      this.http
        .get<ApiResponse<any>>(`${this.apiUrl}/logout`)
        .pipe(take(1))
        .subscribe();
    }
  }

  /**
   * Get Profile
   * Fetches complete user profile from server
   * 
   * @return (Observable<User>) User profile data
   */
  getProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/profile`).pipe(
      map((response) => response.data!),
      tap((user) => {
        this.currentUserSubject.next(user);
        this.updateLastActivity();
      }),
      catchError((error) => this.handleError(error))
    );
  }

  /**
   * Is Authenticated
   * Checks if user has valid session
   * 
   * @return (boolean) True if authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  /**
   * Get Current User
   * Returns current user from local state
   * 
   * @return (User | null) Current user or null
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get Token
   * Retrieves JWT token from storage
   * 
   * @return (string | null) Token or null
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set Auth Data
   * Stores authentication data locally
   * 
   * @param (AuthResponse) authData - Token and user info
   * @return (void)
   */
  private setAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authData.token);
    this.currentUserSubject.next(authData.user);
  }

  /**
   * Clear Auth
   * Removes all authentication data
   * 
   * @return (void)
   */
  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.lastActivityKey);
    sessionStorage.removeItem(this.returnUrlKey);
    this.currentUserSubject.next(null);
  }

  /**
   * Load User Profile
   * Fetches full profile in background
   * 
   * @return (void)
   */
  private loadUserProfile(): void {
    this.getProfile()
      .pipe(take(1))
      .subscribe({
        error: () => {
          // Silent fail - user already has basic data from token
        },
      });
  }

  /**
   * Is Token Expired
   * Checks if JWT token has expired
   * 
   * @param (string) token - JWT token to check
   * @return (boolean) True if expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payload = this.decodeToken(token);
      return payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  }

  /**
   * Decode Token
   * Extracts payload from JWT token
   * 
   * @param (string) token - JWT token to decode
   * @return (TokenPayload) Decoded token data
   */
  private decodeToken(token: string): TokenPayload {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  }

  /**
   * Handle Error
   * Centralized error handling
   * 
   * @param (HttpErrorResponse) error - HTTP error object
   * @return (Observable<never>) Error observable
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}