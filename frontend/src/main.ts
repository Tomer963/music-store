/**
 * Main entry point for the Angular application
 */

import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";

// Enable production mode if needed
if (environment.production) {
  // Production mode optimizations will be enabled
}

// Bootstrap the Angular application
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error("Error bootstrapping the application:", err));
