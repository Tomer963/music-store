/**
 * Error Interceptor
 * Handles HTTP errors globally
 */

import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { catchError, throwError } from "rxjs";

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle specific error codes
      switch (error.status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          authService.logout();
          break;

        case 403:
          // Forbidden - redirect to home
          router.navigate(["/"]);
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
};
