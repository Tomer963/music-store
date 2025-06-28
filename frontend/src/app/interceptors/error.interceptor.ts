/**
 * Error Interceptor
 * Handles HTTP errors globally
 */

import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle specific error codes
        switch (error.status) {
          case 401:
            // Unauthorized - clear auth and redirect to login
            this.authService.logout();
            break;

          case 403:
            // Forbidden - redirect to home
            this.router.navigate(["/"]);
            break;

          case 404:
            // Not found - could redirect to 404 page
            console.error("Resource not found:", error.url);
            break;

          case 500:
            // Server error
            console.error("Server error:", error);
            break;
        }

        // Extract error message
        const errorMessage =
          error.error?.message || error.message || "An error occurred";

        // Return error for component to handle
        return throwError(() => ({
          status: error.status,
          message: errorMessage,
          error: error.error,
        }));
      })
    );
  }
}
