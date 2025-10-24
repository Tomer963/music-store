import { Routes } from "@angular/router";
import { authGuard } from "./guards/auth.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "login",
    loadComponent: () =>
      import("./pages/auth/login/login.component").then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: "album/:id",
    loadComponent: () =>
      import("./components/album/album-detail/album-detail.component").then(
        (m) => m.AlbumDetailComponent
      ),
  },
  {
    path: "checkout",
    loadComponent: () =>
      import("./pages/checkout/checkout.component").then(
        (m) => m.CheckoutComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "my-account",
    loadComponent: () =>
      import("./pages/my-account/my-account.component").then(
        (m) => m.MyAccountComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "wishlist",
    loadComponent: () =>
      import("./pages/wishlist/wishlist.component").then(
        (m) => m.WishlistComponent
      ),
  },
  {
    path: "category/:id",
    loadComponent: () =>
      import("./pages/category/category.component").then(
        (m) => m.CategoryComponent
      ),
  },
  {
    path: "404",
    loadComponent: () =>
      import("./pages/not-found/not-found.component").then(
        (m) => m.NotFoundComponent
      ),
  },
  {
    path: "**",
    redirectTo: "404",
  },
];