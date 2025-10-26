import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { AuthService } from "../../../services/auth.service";
import { CartService } from "../../../services/cart.service";
import { LoginCredentials } from "../../../models/user.model";
import { RegisterModalComponent } from "../register/register.component";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RegisterModalComponent],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  @ViewChild("passwordInput") passwordInput!: ElementRef<HTMLInputElement>;

  loginForm!: FormGroup;
  isLoggingIn = false;
  isSubmitted = false;
  showPassword = false;
  loginError: string | null = null;
  returnUrl = "/";
  showRegisterModal = false;
  isCheckoutRedirect = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cartService: CartService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  /**
   * NgOnInit
   *
   * Initialize component and setup login form with return URL
   *
   * @return void
   */
  ngOnInit(): void {
    // Get return URL from query params or use default
    this.returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/";
    this.isCheckoutRedirect = this.returnUrl === "/checkout";

    // Save return URL for post-login redirect
    if (this.returnUrl && this.returnUrl !== "/") {
      this.authService.saveReturnUrl(this.returnUrl);
    }

    this.initializeForm();
  }

  /**
   * InitializeForm
   *
   * Initialize login form with email and password validators
   *
   * @return void
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, this.passwordValidator]],
    });

    // Clear error message when user starts typing
    this.loginForm.valueChanges.subscribe(() => {
      if (this.loginError) {
        this.loginError = null;
      }
    });
  }

  /**
   * PasswordValidator
   *
   * Custom validator for password format (min 6 chars with uppercase)
   *
   * @param (AbstractControl) control - Form control to validate
   * @return object | null - Validation error or null
   */
  private passwordValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasMinLength = value.length >= 6;

    return hasMinLength && hasUpperCase ? null : { invalidPassword: true };
  }

  /**
   * OnLogin
   *
   * Handle login form submission and redirect on success
   *
   * @return void
   */
  onLogin(): void {
    this.isSubmitted = true;
    this.loginError = null;

    // Validate form before submission
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoggingIn = true;
    const credentials: LoginCredentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: () => {
        this.isLoggingIn = false;
        this.isSubmitted = false;
        this.loginError = null;

        // Refresh cart after successful login
        this.cartService.refreshCart().subscribe({
          next: () => {
            const targetUrl = this.authService.getReturnUrl() || this.returnUrl;
            this.authService.clearReturnUrl();

            // Small delay for smooth transition
            setTimeout(() => {
              this.router.navigate([targetUrl]);
            }, 200);
          },
          error: () => {
            // Navigate even if cart refresh fails
            const targetUrl = this.authService.getReturnUrl() || this.returnUrl;
            this.authService.clearReturnUrl();
            this.router.navigate([targetUrl]);
          },
        });
      },
      error: (error) => {
        this.isLoggingIn = false;

        // Set user-friendly error messages
        if (error.status === 0) {
          this.loginError =
            "Unable to connect to server. Please check your internet connection.";
        } else if (error.status === 401) {
          this.loginError = "Invalid email or password. Please try again.";
        } else if (error.error?.message) {
          this.loginError = error.error.message;
        } else {
          this.loginError = "An error occurred. Please try again.";
        }
      },
    });
  }

  /**
   * OnRegisterSuccess
   *
   * Handle successful registration - auto-login or fill email field
   *
   * @param (any) registrationData - Registration response with email/token
   * @return void
   */
  onRegisterSuccess(registrationData: any): void {
    this.showRegisterModal = false;
    this.loginError = null;

    // Check if user was auto-logged in (has token)
    if (registrationData.token) {
      this.cartService.refreshCart().subscribe({
        next: () => {
          const targetUrl = this.authService.getReturnUrl() || this.returnUrl;
          this.authService.clearReturnUrl();

          setTimeout(() => {
            this.router.navigate([targetUrl]);
          }, 200);
        },
        error: () => {
          const targetUrl = this.authService.getReturnUrl() || this.returnUrl;
          this.authService.clearReturnUrl();
          this.router.navigate([targetUrl]);
        },
      });
    } else {
      // Fill email and focus password field for manual login
      this.loginForm.patchValue({
        email: registrationData.email,
        password: "",
      });

      setTimeout(() => {
        if (this.passwordInput && this.passwordInput.nativeElement) {
          this.passwordInput.nativeElement.focus();
        }
      }, 300);
    }
  }
}
