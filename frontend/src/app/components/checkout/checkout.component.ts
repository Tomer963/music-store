import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { Cart } from '../../models/cart.model';
import { CheckoutStep, PaymentMethod, CreateOrderRequest } from '../../models/order.model';
import { SpinnerComponent } from '../shared/spinner/spinner.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  currentStep = CheckoutStep.BILLING;
  CheckoutStep = CheckoutStep;
  PaymentMethod = PaymentMethod;
  
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  isLoading = true;
  isProcessing = false;
  
  billingForm!: FormGroup;
  paymentForm!: FormGroup;
  
  selectedPaymentMethod = PaymentMethod.CREDIT_CARD;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadCart();
    this.loadUserBillingInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    // Billing Form
    this.billingForm = this.fb.group({
      address: ['', [
        Validators.required,
        Validators.pattern(/^.{3,}.*\d+/)
      ]],
      city: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[a-zA-Z\s]+$/)
      ]],
      zipCode: ['', [
        Validators.required,
        Validators.pattern(/^\d{5}$/)
      ]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^0\d{1,2}-\d{7}$/)
      ]]
    });

    // Payment Form
    this.paymentForm = this.fb.group({
      paymentMethod: [PaymentMethod.CREDIT_CARD, Validators.required],
      // Credit Card fields
      cardType: [''],
      cardNumber: [''],
      cardholderName: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: [''],
      // Check field
      checkNumber: ['']
    });

    // Update validators based on payment method
    this.paymentForm.get('paymentMethod')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(method => {
        this.updatePaymentValidators(method);
      });
  }

  private updatePaymentValidators(method: PaymentMethod): void {
    const cardFields = ['cardType', 'cardNumber', 'cardholderName', 'expiryMonth', 'expiryYear', 'cvv'];
    const checkField = 'checkNumber';

    if (method === PaymentMethod.CREDIT_CARD) {
      // Add credit card validators
      this.paymentForm.get('cardType')?.setValidators([Validators.required]);
      this.paymentForm.get('cardNumber')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{16}$/)
      ]);
      this.paymentForm.get('cardholderName')?.setValidators([
        Validators.required,
        Validators.minLength(3)
      ]);
      this.paymentForm.get('expiryMonth')?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(12)
      ]);
      this.paymentForm.get('expiryYear')?.setValidators([
        Validators.required,
        Validators.min(new Date().getFullYear())
      ]);
      this.paymentForm.get('cvv')?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{3}$/)
      ]);
      
      // Clear check validators
      this.paymentForm.get(checkField)?.clearValidators();
    } else {
      // Add check validator
      this.paymentForm.get(checkField)?.setValidators([
        Validators.required,
        Validators.minLength(3)
      ]);
      
      // Clear credit card validators
      cardFields.forEach(field => {
        this.paymentForm.get(field)?.clearValidators();
      });
    }

    // Update validity
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.updateValueAndValidity();
    });
  }

  private loadCart(): void {
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cart => {
        this.cart = cart;
        this.isLoading = false;
        
        // Redirect to home if cart is empty
        if (cart.itemCount === 0 && !this.isLoading) {
          this.router.navigate(['/']);
        }
      });
  }

  private loadUserBillingInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user?.billingInfo) {
      this.billingForm.patchValue(user.billingInfo);
    }
  }

  nextStep(): void {
    if (this.currentStep === CheckoutStep.BILLING && this.billingForm.valid) {
      this.currentStep = CheckoutStep.PAYMENT;
    } else if (this.currentStep === CheckoutStep.PAYMENT && this.paymentForm.valid) {
      this.currentStep = CheckoutStep.REVIEW;
    }
  }

  previousStep(): void {
    if (this.currentStep === CheckoutStep.PAYMENT) {
      this.currentStep = CheckoutStep.BILLING;
    } else if (this.currentStep === CheckoutStep.REVIEW) {
      this.currentStep = CheckoutStep.PAYMENT;
    }
  }

  goToStep(step: CheckoutStep): void {
    if (step < this.currentStep) {
      this.currentStep = step;
    }
  }

  placeOrder(): void {
    if (!this.billingForm.valid || !this.paymentForm.valid) {
      return;
    }

    this.isProcessing = true;

    const orderData: CreateOrderRequest = {
      billingInfo: this.billingForm.value,
      paymentMethod: this.paymentForm.value.paymentMethod,
      paymentInfo: this.getPaymentInfo()
    };

    this.orderService.createOrder(orderData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          // Clear cart
          this.cartService.clearCart().subscribe();
          
          // Navigate to success page or order details
          this.router.navigate(['/my-account/orders', order._id]);
        },
        error: (error) => {
          console.error('Order creation failed:', error);
          this.isProcessing = false;
          // Show error message to user
        }
      });
  }

  private getPaymentInfo(): any {
    const formValue = this.paymentForm.value;
    
    if (formValue.paymentMethod === PaymentMethod.CREDIT_CARD) {
      return {
        cardType: formValue.cardType,
        cardNumber: formValue.cardNumber,
        cardholderName: formValue.cardholderName,
        expiryMonth: formValue.expiryMonth,
        expiryYear: formValue.expiryYear,
        cvv: formValue.cvv
      };
    } else {
      return {
        checkNumber: formValue.checkNumber
      };
    }
  }

  getStepClass(step: CheckoutStep): string {
    if (step < this.currentStep) return 'completed';
    if (step === this.currentStep) return 'active';
    return 'inactive';
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}