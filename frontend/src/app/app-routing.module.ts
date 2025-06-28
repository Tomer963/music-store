/**
 * Application routing configuration
 * Defines all routes and their associated components
 */

import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

// Page Components
import { HomeComponent } from "./pages/home/home.component";
import { CategoryComponent } from "./pages/category/category.component";
import { WishlistComponent } from "./pages/wishlist/wishlist.component";
import { MyAccountComponent } from "./pages/my-account/my-account.component";
import { NotFoundComponent } from "./pages/not-found/not-found.component";

// Album Components
import { AlbumDetailComponent } from "./components/album/album-detail/album-detail.component";

// Auth Components
import { LoginComponent } from "./components/auth/login/login.component";

// Checkout Component
import { CheckoutComponent } from "./components/checkout/checkout.component";

// Guards
import { AuthGuard } from "./guards/auth.guard";
import { GuestGuard } from "./guards/guest.guard";

const routes: Routes = [
  // Home page
  {
    path: "",
    component: HomeComponent,
    pathMatch: "full",
  },

  // Category page
  {
    path: "category/:id",
    component: CategoryComponent,
  },

  // Album detail page
  {
    path: "album/:id",
    component: AlbumDetailComponent,
  },

  // Wishlist page
  {
    path: "wishlist",
    component: WishlistComponent,
  },

  // My Account page (requires authentication)
  {
    path: "my-account",
    component: MyAccountComponent,
    canActivate: [AuthGuard],
  },

  // Login/Register page (only for guests)
  {
    path: "login",
    component: LoginComponent,
    canActivate: [GuestGuard],
  },

  // Checkout page (requires authentication)
  {
    path: "checkout",
    component: CheckoutComponent,
    canActivate: [AuthGuard],
  },

  // 404 page
  {
    path: "404",
    component: NotFoundComponent,
  },

  // Redirect to 404 for any unknown routes
  {
    path: "**",
    redirectTo: "404",
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: "enabled",
      anchorScrolling: "enabled",
      scrollOffset: [0, 64],
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
