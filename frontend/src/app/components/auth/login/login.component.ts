/**
 * Login Component
 * Handles user login and registration
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "../../../services/auth.service";
import { RegisterComponent } from "../register/register.component";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RegisterComponent, SpinnerComponent],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  loginError = "";
  returnUrl = "/";
  showRegisterModal = false;
  registrationSuccess = false;
  registeredEmail = "";
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initialize form
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6), this.passwordValidator]],
    });

    // Get return URL from route parameters
    this.returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/";

    // If already logged in, redirect
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Password validator - must contain at least one uppercase letter
   */
  passwordValidator(control: any): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    
    const hasUpperCase = /[A-Z]/.test(value);
    return hasUpperCase ? null : { noUpperCase: true };
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Mark all fields as touched to show validation errors
    this.markFormGroupTouched(this.loginForm);

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.loginError = "";

    this.authService
      .login(this.loginForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          this.isLoading = false;
          this.loginError = error.error?.message || "Invalid email or password";
          this.loginForm.get("password")?.reset();
        },
      });
  }

  /**
   * Show registration modal
   */
  showRegister(): void {
    this.showRegisterModal = true;
  }

  /**
   * Handle registration complete
   */
  onRegistrationComplete(email: string): void {
    this.registeredEmail = email;
    this.showRegisterModal = false;
    this.registrationSuccess = true;

    // Set email in login form
    this.loginForm.patchValue({ email });
    
    // Focus password field after animation
    setTimeout(() => {
      const passwordField = document.querySelector<HTMLInputElement>('#password');
      if (passwordField) {
        passwordField.focus();
      }
    }, 100);

    // Hide success message after 5 seconds
    setTimeout(() => {
      this.registrationSuccess = false;
    }, 5000);
  }

  /**
   * Close registration modal
   */
  onRegistrationCancel(): void {
    this.showRegisterModal = false;
  }

  /**
   * Mark all fields in form group as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string, errorType?: string): boolean {
    const field = this.loginForm.get(fieldName);
    if (!field) return false;

    if (errorType) {
      return field.hasError(errorType) && (field.dirty || field.touched);
    }
    
    return field.invalid && (field.dirty || field.touched);
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (!field || !field.errors) return "";

    if (field.hasError("required")) {
      return "This field is required";
    }
    
    if (fieldName === "email" && field.hasError("email")) {
      return "Please enter a valid email address";
    }
    
    if (fieldName === "password") {
      if (field.hasError("minlength")) {
        return "Password must be at least 6 characters";
      }
      if (field.hasError("noUpperCase")) {
        return "Password must contain at least one uppercase letter";
      }
    }

    return "";
  }
}