import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Auth Guard
 *
 * Protects routes that require user authentication
 *
 * @param route - Activated route snapshot
 * @param state - Current router state
 * @return True if user can activate route
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Save return URL and redirect to login
  authService.saveReturnUrl(state.url);
  router.navigate(["/login"], {
    queryParams: { returnUrl: state.url },
  });

  return false;
};