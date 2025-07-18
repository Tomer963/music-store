/**
 * Main entry point for the Angular application
 */

import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { importProvidersFrom } from "@angular/core";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app-routing.module";
import { authInterceptor } from "./app/interceptors/auth.interceptor";
import { errorInterceptor } from "./app/interceptors/error.interceptor";

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
  ],
}).catch((err) => console.error("Error bootstrapping the application:", err));