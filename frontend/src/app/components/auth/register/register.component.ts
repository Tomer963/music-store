/**
 * Register Component
 * Modal for user registration
 */

import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from "@angular/forms";
import { AuthService } from "../../../services/auth.service";
import { SpinnerComponent } from "../../shared/spinner/spinner.component";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.css"],
})
export class RegisterComponent implements OnInit {
  @Output() registrationComplete = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  registerForm!: FormGroup;
  isLoading = false;
  registrationError = "";
  isSuccess = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {}

  ngOnInit(): void {
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
        email: ["", [Validators.required, Validators.email]],
        password: [
          "",
          [
            Validators.required,
            Validators.minLength(6),
            this.passwordValidator,
          ],
        ],
        confirmPassword: ["", [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  /**
   * Password validator - must contain at least one uppercase letter
   */
  passwordValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    return hasUpperCase ? null : { noUpperCase: true };
  }

  /**
   * Password match validator
   */
  passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get("password");
    const confirmPassword = control.get("confirmPassword");

    if (!password || !confirmPassword) return null;

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Clear error if passwords match
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors["passwordMismatch"];
        confirmPassword.setErrors(Object.keys(errors).length === 0 ? null : errors);
      }
    }

    return null;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Mark all fields as touched
    this.markFormGroupTouched(this.registerForm);

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.registrationError = "";

    // Remove confirmPassword from submission data
    const { confirmPassword, ...registrationData } = this.registerForm.value;

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSuccess = true;

        // Show success message briefly
        setTimeout(() => {
          this.registrationComplete.emit(registrationData.email);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.registrationError =
          error.error?.message || "Registration failed. Please try again.";
      },
    });
  }

  /**
   * Close modal
   */
  onCancel(): void {
    if (!this.isLoading) {
      this.cancel.emit();
    }
  }

  /**
   * Mark all fields as touched
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
    const field = this.registerForm.get(fieldName);
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
    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors) return "";

    switch (fieldName) {
      case "firstName":
      case "lastName":
        if (field.hasError("required")) {
          return `${fieldName === "firstName" ? "First" : "Last"} name is required`;
        }
        if (field.hasError("minlength")) {
          return `Must be at least 2 characters`;
        }
        if (field.hasError("maxlength")) {
          return `Cannot exceed 12 characters`;
        }
        break;

      case "email":
        if (field.hasError("required")) {
          return "Email is required";
        }
        if (field.hasError("email")) {
          return "Please enter a valid email address";
        }
        break;

      case "password":
        if (field.hasError("required")) {
          return "Password is required";
        }
        if (field.hasError("minlength")) {
          return "Password must be at least 6 characters";
        }
        if (field.hasError("noUpperCase")) {
          return "Password must contain at least one uppercase letter";
        }
        break;

      case "confirmPassword":
        if (field.hasError("required")) {
          return "Please confirm your password";
        }
        if (field.hasError("passwordMismatch")) {
          return "Passwords do not match";
        }
        break;
    }

    return "";
  }
}