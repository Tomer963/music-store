import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { catchError, throwError } from "rxjs";

/**
 * Error Interceptor
 *
 * Handles HTTP errors globally
 *
 * @param req - HTTP request
 * @param next - HTTP handler
 * @return Observable HTTP event with error handling
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle specific HTTP status codes
      if (error.status === 401 && !req.url.includes("/auth/login")) {
        authService.logout();
      } else if (error.status === 403) {
        router.navigate(["/"]);
      }
      
      return throwError(() => error);
    }),
  );
};