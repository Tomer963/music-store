import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Guest Guard
 *
 * Prevents authenticated users from accessing guest-only pages
 *
 * @param route - Activated route snapshot
 * @param state - Current router state
 * @return True if user can activate route
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Redirect authenticated users to home
  router.navigate(["/"]);
  return false;
};