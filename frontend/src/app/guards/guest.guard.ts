import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Guest Guard
 * Prevents authenticated users from accessing guest-only pages
 * 
 * @param (ActivatedRouteSnapshot) route - Current route
 * @param (RouterStateSnapshot) state - Router state
 * @return (boolean) True if guest can access route
 */
export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  router.navigate(["/"]);
  return false;
};