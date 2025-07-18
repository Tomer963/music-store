/**
 * Register Component
 * Handles user registration
 */

import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from "@angular/forms";
import { RouterModule, Router } from "@angular/router";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./register.component.html",
  styleUrls: ["./register.component.css"],
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  error: string | null = null;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize form with validators
    this.registerForm = this.formBuilder.group({
      firstName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(12),
        Validators.pattern(/^[a-zA-Z\s]*$/)
      ]],
      lastName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(12),
        Validators.pattern(/^[a-zA-Z\s]*$/)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        this.passwordValidator
      ]],
      confirmPassword: ['', [
        Validators.required
      ]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Custom password validator
   */
  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    if (!hasUpperCase) {
      return { uppercase: true };
    }

    return null;
  }

  /**
   * Password match validator
   */
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      // Clear mismatch error if passwords match
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['mismatch'];
        confirmPassword.setErrors(Object.keys(errors).length ? errors : null);
      }
    }

    return null;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    this.error = null;

    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registrationData } = this.registerForm.value;

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        // Navigate to home after successful registration
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.message || 'Registration failed. Please try again.';
      }
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get form control
   */
  get f() {
    return this.registerForm.controls;
  }

  /**
   * Check if field has error
   */
  hasError(field: string): boolean {
    const control = this.registerForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Get error message for field
   */
  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);
    if (control?.errors) {
      if (control.errors['required']) {
        return `${this.formatFieldName(field)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email';
      }
      if (control.errors['minlength']) {
        const minLength = control.errors['minlength'].requiredLength;
        return `${this.formatFieldName(field)} must be at least ${minLength} characters`;
      }
      if (control.errors['maxlength']) {
        const maxLength = control.errors['maxlength'].requiredLength;
        return `${this.formatFieldName(field)} cannot exceed ${maxLength} characters`;
      }
      if (control.errors['pattern']) {
        return `${this.formatFieldName(field)} can only contain letters`;
      }
      if (control.errors['uppercase']) {
        return 'Password must contain at least one uppercase letter';
      }
      if (control.errors['mismatch']) {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  /**
   * Format field name for display
   */
  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}