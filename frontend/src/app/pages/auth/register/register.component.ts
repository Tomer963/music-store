import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../../services/auth.service";
import { RegistrationData } from "../../../models/user.model";

@Component({
  selector: "app-register-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.css"],
})
export class RegisterModalComponent {
  @Input() isOpen = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() registerSuccess = new EventEmitter<any>();

  registerForm: FormGroup;
  isLoading = false;
  showSuccess = false;
  errorMessage = "";
  isSubmitted = false;
  showPassword = false;
  showConfirmPassword = false;
  touchedFields: Set<string> = new Set();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.registerForm = this.fb.group(
      {
        firstName: [
          "",
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(12),
          ],
        ],
        lastName: [
          "",
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(12),
          ],
        ],
        newsletter: [false],
        email: ["", [Validators.required, this.emailValidator]],
        password: [
          "",
          [
            Validators.required,
            Validators.minLength(6),
            Validators.pattern(/[A-Z]/),
          ],
        ],
        confirmPassword: ["", Validators.required],
        acceptTerms: [false, Validators.requiredTrue],
      },
      { validators: this.passwordMatchValidator },
    );

    this.setupFieldChangeTracking();
  }

  /**
   * Setup Field Change Tracking
   *
   * Track field changes to remove errors when user starts typing
   *
   * @return void
   */
  private setupFieldChangeTracking(): void {
    const fields = [
      "firstName",
      "lastName",
      "email",
      "password",
      "confirmPassword",
      "acceptTerms",
    ];

    fields.forEach((field) => {
      this.registerForm.get(field)?.valueChanges.subscribe(() => {
        // Remove from touched fields when user edits after submission
        if (this.isSubmitted && this.touchedFields.has(field)) {
          this.touchedFields.delete(field);
        }
      });
    });
  }

  /**
   * Email Validator
   *
   * Custom email validator supporting Hebrew and English characters
   *
   * @param (AbstractControl) control - Form control to validate
   * @return ValidationErrors | null - Validation error or null
   */
  private emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Email regex supporting Hebrew, English, numbers, and special chars
    const emailRegex = /^[a-zA-Z0-9א-ת._+-]+@[a-zA-Z0-9א-ת.-]+\.[a-zA-Z]{2,}$/;

    return emailRegex.test(value) ? null : { invalidEmail: true };
  }

  /**
   * Password Match Validator
   *
   * Validate that password and confirm password match
   *
   * @param (FormGroup) form - Form group to validate
   * @return null - Always returns null (sets errors directly on control)
   */
  passwordMatchValidator(form: FormGroup): null {
    const password = form.get("password");
    const confirmPassword = form.get("confirmPassword");

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else if (
      password &&
      confirmPassword &&
      password.value === confirmPassword.value &&
      confirmPassword.errors?.["passwordMismatch"]
    ) {
      confirmPassword.setErrors(null);
    }

    return null;
  }

  /**
   * Should Show Error
   *
   * Determine if error should be displayed for a field
   *
   * @param (string) fieldName - Field name to check
   * @return boolean - True if error should be shown
   */
  shouldShowError(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    if (!control) return false;

    // Show error only if form submitted AND field has errors AND not edited after submission
    return (
      this.isSubmitted && control.invalid && this.touchedFields.has(fieldName)
    );
  }

  /**
   * Close Modal
   *
   * Close registration modal and reset form
   *
   * @return void
   */
  closeModal(): void {
    if (!this.isLoading) {
      this.closeModalEvent.emit();
      this.resetForm();
    }
  }

  /**
   * Go To Login
   *
   * Navigate to login page and close modal
   *
   * @return void
   */
  goToLogin(): void {
    if (!this.isLoading) {
      this.closeModalEvent.emit();
      this.resetForm();
      this.router.navigate(["/login"]);
    }
  }

  /**
   * On Submit
   *
   * Handle registration form submission
   *
   * @return void
   */
  onSubmit(): void {
    this.isSubmitted = true;
    this.errorMessage = "";

    // Mark all fields as touched for validation display
    Object.keys(this.registerForm.controls).forEach((key) => {
      this.registerForm.get(key)?.markAsTouched();
      this.touchedFields.add(key);
    });

    if (!this.registerForm.valid || this.isLoading) return;

    this.isLoading = true;

    const formData: RegistrationData = {
      firstName: this.registerForm.value.firstName,
      lastName: this.registerForm.value.lastName,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password,
      confirmPassword: this.registerForm.value.confirmPassword,
      newsletter: this.registerForm.value.newsletter,
      acceptTerms: this.registerForm.value.acceptTerms,
    };

    this.authService.register(formData).subscribe({
      next: () => {
        this.isLoading = false;
        this.showSuccess = true;

        // Wait 5 seconds before closing and emitting success
        setTimeout(() => {
          this.registerSuccess.emit({
            email: formData.email,
          });

          this.resetForm();
          this.closeModalEvent.emit();
        }, 5000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message || "Registration failed. Please try again.";
        
        // Auto-clear error message after 5 seconds
        setTimeout(() => (this.errorMessage = ""), 5000);
      },
    });
  }

  /**
   * Reset Form
   *
   * Reset form to initial state and clear all flags
   *
   * @return void
   */
  private resetForm(): void {
    this.registerForm.reset({
      firstName: "",
      lastName: "",
      newsletter: false,
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    });
    this.showSuccess = false;
    this.errorMessage = "";
    this.isLoading = false;
    this.isSubmitted = false;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.touchedFields.clear();
  }
}