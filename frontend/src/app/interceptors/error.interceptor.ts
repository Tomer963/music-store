import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { catchError, throwError } from "rxjs";

/**
 * Error Interceptor
 * Handles HTTP errors globally (401, 403, etc.)
 * @param req HTTP request
 * @param next HTTP handler
 * @return Observable HTTP event with error handling
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle different HTTP error codes
      switch (error.status) {
        case 401: // Unauthorized
          // Only logout if not on login page
          if (!req.url.includes("/auth/login")) {
            authService.logout();
          }
          break;
        case 403: // Forbidden
          router.navigate(["/"]);
          break;
      }
      return throwError(() => error);
    })
  );
};
