import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from "@angular/forms";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.css"],
})
export class LoginComponent implements OnInit {
  @ViewChild('passwordInput') passwordInput!: ElementRef;
  
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  
  isLoading = false;
  isRegistering = false;
  loginError = '';
  registerError = '';
  returnUrl = '/';
  
  showPassword = false;
  showRegisterPassword = false;
  showConfirmPassword = false;
  
  showRegisterModal = false;
  registrationSuccess = false;
  registeredEmail = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.createForms();
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  createForms(): void {
    // Login Form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, this.emailValidator]],
      password: ['', [Validators.required, this.passwordValidator]]
    });

    // Register Form
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(12)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(12)]],
      email: ['', [Validators.required, this.emailValidator]],
      password: ['', [Validators.required, this.passwordValidator]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Custom email validator
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!email) return null;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) ? null : { invalidEmail: true };
  }

  // Custom password validator - at least 6 chars with 1 uppercase
  passwordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;
    
    if (password.length < 6) {
      return { minLength: true };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { noUppercase: true };
    }
    
    return null;
  }

  // Password match validator
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        if (Object.keys(errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
      return null;
    }
  }

  // Getters for login form
  get loginEmail() {
    return this.loginForm.get('email');
  }

  get loginPassword() {
    return this.loginForm.get('password');
  }

  // Getters for register form
  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get registerEmail() {
    return this.registerForm.get('email');
  }

  get registerPassword() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  // Toggle password visibility
  toggleLoginPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleRegisterPassword(): void {
    this.showRegisterPassword = !this.showRegisterPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Show register modal
  openRegisterModal(): void {
    this.showRegisterModal = true;
    this.registrationSuccess = false;
    this.registerForm.reset();
    this.registerError = '';
  }

  // Close register modal
  closeRegisterModal(): void {
    this.showRegisterModal = false;
    this.registrationSuccess = false;
  }

  // Login submit
  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    // Simulate API call
    setTimeout(() => {
      const credentials = this.loginForm.value;
      console.log('Login attempt:', credentials.email);
      
      // Demo login
      const demoUser = {
        id: '1',
        email: credentials.email,
        firstName: 'Demo',
        lastName: 'User'
      };
      
      localStorage.setItem('music_store_token', 'demo-token-12345');
      localStorage.setItem('music_store_user', JSON.stringify(demoUser));
      
      this.isLoading = false;
      this.router.navigate([this.returnUrl]);
    }, 1000);
  }

  // Register submit
  onRegisterSubmit(): void {
    if (this.registerForm.invalid) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isRegistering = true;
    this.registerError = '';

    // Simulate API call
    setTimeout(() => {
      const userData = this.registerForm.value;
      console.log('Registration attempt:', userData);
      
      // Store email for later
      this.registeredEmail = userData.email;
      
      // Show success message
      this.registrationSuccess = true;
      this.isRegistering = false;
      
      // After 5 seconds, close modal and fill login form
      setTimeout(() => {
        this.closeRegisterModal();
        this.loginForm.patchValue({ email: this.registeredEmail });
        
        // Focus on password field
        setTimeout(() => {
          if (this.passwordInput) {
            this.passwordInput.nativeElement.focus();
          }
        }, 100);
      }, 5000);
    }, 1500);
  }
}