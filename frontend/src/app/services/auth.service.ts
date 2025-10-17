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

  // Session timeout: 30 minutes of inactivity
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000;

  // Activity check interval: check every minute
  private readonly ACTIVITY_CHECK_INTERVAL = 60 * 1000;

  constructor(private http: HttpClient, private router: Router) {
    this.setupActivityTracking();
    this.setupInactivityCheck();
  }

  /**
   * Setup Activity Tracking
   * @return void
   */
  private setupActivityTracking(): void {
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
   * @return void
   */
  private setupInactivityCheck(): void {
    interval(this.ACTIVITY_CHECK_INTERVAL).subscribe(() => {
      if (this.isAuthenticated()) {
        const lastActivity = this.getLastActivity();
        const now = Date.now();

        if (lastActivity && now - lastActivity > this.INACTIVITY_TIMEOUT) {
          console.log("Session expired due to inactivity");
          this.handleSessionExpiry();
        }
      }
    });
  }

  /**
   * Update Last Activity
   * @return void
   */
  private updateLastActivity(): void {
    localStorage.setItem(this.lastActivityKey, Date.now().toString());
  }

  /**
   * Get Last Activity
   * @return number | null
   */
  private getLastActivity(): number | null {
    const timestamp = localStorage.getItem(this.lastActivityKey);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  /**
   * Handle Session Expiry
   * @return void
   */
  private handleSessionExpiry(): void {
    this.clearAuth();
    this.router.navigate(["/"], {
      queryParams: { sessionExpired: "true" },
    });
  }

  /**
   * Initialize Auth
   * Called on app startup to restore user session
   * @return void
   */
  initializeAuth(): void {
    const token = this.getToken();

    // Check if token exists and is valid
    if (token && !this.isTokenExpired(token)) {
      // Check for inactivity timeout
      const lastActivity = this.getLastActivity();
      const now = Date.now();

      if (lastActivity && now - lastActivity > this.INACTIVITY_TIMEOUT) {
        console.log("Session expired during initialization");
        this.clearAuth();
        return;
      }

      // Decode token to get user data
      try {
        const payload = this.decodeToken(token);
        
        // Set user data from token
        const user: User = {
          _id: payload.id,
          email: payload.email,
          firstName: "", // Will be loaded from profile
          lastName: "",
          role: payload.role as "user" | "admin", // ✅ Fixed: Cast role to correct type
          wishlist: [],
          createdAt: new Date().toISOString(), // ✅ Fixed: Convert to ISO string
          updatedAt: new Date().toISOString(), // ✅ Fixed: Convert to ISO string
        };

        this.currentUserSubject.next(user);
        this.updateLastActivity();

        // Load full profile in background
        this.loadUserProfile();
      } catch (error) {
        console.error("Failed to decode token:", error);
        this.clearAuth();
      }
    } else {
      this.clearAuth();
    }
  }

  /**
   * Register
   * @param data Registration form data
   * @return Observable<AuthResponse>
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
   * @param credentials Login credentials
   * @return Observable<AuthResponse>
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
   * @param url URL to return to after login
   * @return void
   */
  saveReturnUrl(url: string): void {
    if (url && url !== "/login" && url !== "/") {
      sessionStorage.setItem(this.returnUrlKey, url);
    }
  }

  /**
   * Get Return URL
   * @return string | null
   */
  getReturnUrl(): string | null {
    return sessionStorage.getItem(this.returnUrlKey);
  }

  /**
   * Clear Return URL
   * @return void
   */
  clearReturnUrl(): void {
    sessionStorage.removeItem(this.returnUrlKey);
  }

  /**
   * Logout
   * @return void
   */
  logout(): void {
    const token = this.getToken();
    this.clearAuth();

    if (token) {
      this.http
        .get<ApiResponse<any>>(`${this.apiUrl}/logout`)
        .pipe(take(1))
        .subscribe({
          error: (error) => console.error("Logout error:", error),
          complete: () => this.router.navigate(["/"]),
        });
    } else {
      this.router.navigate(["/"]);
    }
  }

  /**
   * Get Profile
   * @return Observable<User>
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
   * @return boolean
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const isValid = token !== null && !this.isTokenExpired(token);
    
    // Debug log
    console.log("Auth check:", {
      hasToken: !!token,
      isValid,
      hasUser: !!this.currentUserSubject.value
    });
    
    return isValid;
  }

  /**
   * Get Current User
   * @return User | null
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get Token
   * @return string | null
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set Auth Data
   * @param authData Authentication response
   * @return void
   */
  private setAuthData(authData: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authData.token);
    this.currentUserSubject.next(authData.user);
  }

  /**
   * Clear Auth
   * @return void
   */
  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.lastActivityKey);
    sessionStorage.removeItem(this.returnUrlKey);
    this.currentUserSubject.next(null);
  }

  /**
   * Load User Profile
   * @return void
   */
  private loadUserProfile(): void {
    this.getProfile()
      .pipe(take(1))
      .subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
        },
        error: (error) => {
          console.error("Failed to load profile:", error);
          // Don't clear auth on profile load error
        },
      });
  }

  /**
   * Is Token Expired
   * @param token JWT token
   * @return boolean
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
   * @param token JWT token
   * @return TokenPayload
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
   * @param error HTTP error
   * @return Observable<never>
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error("Auth service error:", error);
    return throwError(() => error);
  }
}