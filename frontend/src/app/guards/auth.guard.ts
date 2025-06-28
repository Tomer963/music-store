/**
 * Auth Guard
 * Protects routes that require authentication
 */

import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting
  const returnUrl = state.url;

  // Navigate to login page with return URL
  router.navigate(["/login"], {
    queryParams: { returnUrl },
  });

  return false;
};
