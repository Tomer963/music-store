/**
 * Main application module
 * Imports and configures all necessary modules, components, and services
 */

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Routing
import { AppRoutingModule } from './app-routing.module';

// Components
import { AppComponent } from './app.component';

// Layout Components
import { HeaderComponent } from './components/layout/header/header.component';
import { SidebarComponent } from './components/layout/sidebar/sidebar.component';
import { FooterComponent } from './components/layout/footer/footer.component';

// Page Components
import { HomeComponent } from './pages/home/home.component';
import { CategoryComponent } from './pages/category/category.component';
import { WishlistComponent } from './pages/wishlist/wishlist.component';
import { MyAccountComponent } from './pages/my-account/my-account.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

// Album Components
import { AlbumCardComponent } from './components/album/album-card/album-card.component';
import { AlbumDetailComponent } from './components/album/album-detail/album-detail.component';
import { AlbumListComponent } from './components/album/album-list/album-list.component';

// Cart Components
import { CartWidgetComponent } from './components/cart/cart-widget/cart-widget.component';
import { CartItemComponent } from './components/cart/cart-item/cart-item.component';

// Auth Components
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';

// Checkout Component
import { CheckoutComponent } from './components/checkout/checkout.component';

// Shared Components
import { SpinnerComponent } from './components/shared/spinner/spinner.component';
import { SearchBoxComponent } from './components/shared/search-box/search-box.component';

// Services
import { AuthService } from './services/auth.service';
import { AlbumService } from './services/album.service';
import { CategoryService } from './services/category.service';
import { CartService } from './services/cart.service';
import { OrderService } from './services/order.service';
import { WishlistService } from './services/wishlist.service';
import { SearchService } from './services/search.service';

// Guards
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';

// Pipes
import { CurrencyPipe } from './pipes/currency.pipe';
import { TruncatePipe } from './pipes/truncate.pipe';

// Directives
import { LazyLoadDirective } from './directives/lazy-load.directive';

@NgModule({
  declarations: [
    // Only non-standalone components go here
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    
    // Import standalone components
    AppComponent,
    HeaderComponent,
    SidebarComponent,
    FooterComponent,
    HomeComponent,
    CategoryComponent,
    WishlistComponent,
    MyAccountComponent,
    NotFoundComponent,
    AlbumCardComponent,
    AlbumDetailComponent,
    AlbumListComponent,
    CartWidgetComponent,
    CartItemComponent,
    LoginComponent,
    RegisterComponent,
    CheckoutComponent,
    SpinnerComponent,
    SearchBoxComponent,
    CurrencyPipe,
    TruncatePipe,
    LazyLoadDirective
  ],
  providers: [
    // Services
    AuthService,
    AlbumService,
    CategoryService,
    CartService,
    OrderService,
    WishlistService,
    SearchService,
    
    // Guards
    AuthGuard,
    GuestGuard,
    
    // Interceptors
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }