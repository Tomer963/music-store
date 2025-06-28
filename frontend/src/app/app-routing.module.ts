/**
 * Application routes configuration
 */

import { Routes } from "@angular/router";
import { HomeComponent } from "./pages/home/home.component";
import { CategoryComponent } from "./pages/category/category.component";
import { WishlistComponent } from "./pages/wishlist/wishlist.component";
import { MyAccountComponent } from "./pages/my-account/my-account.component";
import { NotFoundComponent } from "./pages/not-found/not-found.component";
import { AlbumDetailComponent } from "./components/album/album-detail/album-detail.component";
import { LoginComponent } from "./components/auth/login/login.component";
import { CheckoutComponent } from "./components/checkout/checkout.component";
import { authGuard } from "./guards/auth.guard";
import { guestGuard } from "./guards/guest.guard";

export const routes: Routes = [
  {
    path: "",
    component: HomeComponent,
    pathMatch: "full",
  },
  {
    path: "category/:id",
    component: CategoryComponent,
  },
  {
    path: "album/:id",
    component: AlbumDetailComponent,
  },
  {
    path: "wishlist",
    component: WishlistComponent,
  },
  {
    path: "my-account",
    component: MyAccountComponent,
    canActivate: [authGuard],
  },
  {
    path: "login",
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: "checkout",
    component: CheckoutComponent,
    canActivate: [authGuard],
  },
  {
    path: "404",
    component: NotFoundComponent,
  },
  {
    path: "**",
    redirectTo: "404",
  },
];
