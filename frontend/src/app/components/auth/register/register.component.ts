/**
 * Register Component
 * Handles user registration
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RegistrationData } from '../../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  validationErrors: any = {};

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initialize registration form
   */
  private initializeForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(12)
      ]],
      lastName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(12)
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/[A-Z]/) // At least one uppercase letter
      ]],
      confirmPassword: ['', [
        Validators.required
      ]]
    }, { validators: this.passwordMatchValidator });
  }

  /**
   * Custom validator for password match
   */
  private passwordMatchValidator(group: FormGroup): {[key: string]: any} | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value 
      ? null 
      : { passwordMismatch: true };
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    console.log('Form valid?', this.registerForm.valid);
    console.log('Form errors:', this.registerForm.errors);
    console.log('Form values:', this.registerForm.value);
    
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.validationErrors = {};

    // Extract form values and remove confirmPassword
    const { confirmPassword, ...registrationData } = this.registerForm.value;
    
    console.log('Sending registration data:', registrationData);
    console.log('Data being sent:', JSON.stringify(registrationData));

    this.authService.register(registrationData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        // Navigate to home or redirect to intended page
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Registration error:', error);
        console.error('Error details:', {
          status: error.status,
          message: error.message,
          error: error.error,
          errors: error.error?.errors
        });
        this.isLoading = false;
        
        if (error.error?.errors && Array.isArray(error.error.errors)) {
          // Handle validation errors from backend
          console.log('Validation errors from backend:', error.error.errors);
          this.validationErrors = {};
          error.error.errors.forEach((err: any) => {
            console.log('Validation error:', err);
            this.validationErrors[err.field || err.param] = err.message || err.msg;
          });
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      }
    });
  }

  /**
   * Mark all fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched)) || !!this.validationErrors[fieldName];
  }

  /**
   * Get error message for field
   */
  getErrorMessage(fieldName: string): string {
    if (this.validationErrors[fieldName]) {
      return this.validationErrors[fieldName];
    }

    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    
    if (field.errors['minlength']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    
    if (field.errors['maxlength']) {
      return `${this.getFieldLabel(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
    }
    
    if (field.errors['email']) {
      return 'Please enter a valid email address';
    }
    
    if (fieldName === 'password' && field.errors['pattern']) {
      return 'Password must contain at least one uppercase letter';
    }

    if (fieldName === 'confirmPassword' && this.registerForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }

    return 'Invalid input';
  }

  /**
   * Get field label for error messages
   */
  private getFieldLabel(fieldName: string): string {
    const labels: {[key: string]: string} = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password'
    };
    return labels[fieldName] || fieldName;
  }
}