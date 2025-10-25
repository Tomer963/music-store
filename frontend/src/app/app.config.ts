import { ApplicationConfig, APP_INITIALIZER } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { routes } from "./app.routes";
import { authInterceptor } from "./interceptors/auth.interceptor";
import { errorInterceptor } from "./interceptors/error.interceptor";
import { AuthService } from "./services/auth.service";

/**
 * Initialize Auth Service
 * 
 * Restores user session before app starts
 *
 * @param (AuthService) authService - Authentication service instance
 * @return () => Promise<void> Initialization function
 */
function initializeAuth(authService: AuthService) {
  return () => {
    // Restore user session from token if available
    authService.initializeAuth();
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // HTTP client with auth and error handling interceptors
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    {
      // Initialize auth before app bootstraps
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};