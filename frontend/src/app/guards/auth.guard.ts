import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Auth Guard
 * Protects routes requiring authentication
 *
 * @param (ActivatedRouteSnapshot) route - Current route
 * @param (RouterStateSnapshot) state - Router state
 * @return (boolean) True if user can access route
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store return URL for post-login redirect
  authService.saveReturnUrl(state.url);
  router.navigate(["/login"], {
    queryParams: { returnUrl: state.url },
  });

  return false;
};
