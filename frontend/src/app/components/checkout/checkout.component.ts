/**
 * Checkout Component
 * Handles the complete checkout process including billing, payment, and order review
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { CartService } from "../../services/cart.service";
import { OrderService } from "../../services/order.service";
import { Cart } from "../../models/cart.model";
import { User } from "../../models/user.model";
import {
  CheckoutStep,
  PaymentMethod,
  CreateOrderRequest,
  Order,
} from "../../models/order.model";
import { SpinnerComponent } from "../shared/spinner/spinner.component";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: "./checkout.component.html",
  styleUrls: ["./checkout.component.css"],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  currentStep: CheckoutStep = CheckoutStep.BILLING;
  billingForm!: FormGroup;
  paymentForm!: FormGroup;
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  currentUser: User | null = null;
  isLoading = true;
  isProcessing = false;

  // Form data storage
  billingInfo: any = null;
  paymentInfo: any = null;

  // Date options
  months = [
    { value: 1, label: "01 - January" },
    { value: 2, label: "02 - February" },
    { value: 3, label: "03 - March" },
    { value: 4, label: "04 - April" },
    { value: 5, label: "05 - May" },
    { value: 6, label: "06 - June" },
    { value: 7, label: "07 - July" },
    { value: 8, label: "08 - August" },
    { value: 9, label: "09 - September" },
    { value: 10, label: "10 - October" },
    { value: 11, label: "11 - November" },
    { value: 12, label: "12 - December" },
  ];

  years: number[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private cartService: CartService,
    private orderService: OrderService
  ) {
    this.initializeForms();
    this.generateYears();
  }

  ngOnInit(): void {
    // Check authentication
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        if (!user) {
          // Redirect to login if not authenticated
          this.router.navigate(["/login"], {
            queryParams: { returnUrl: "/checkout" },
          });
          return;
        }

        // Pre-fill billing info if exists
        if (user.billingInfo) {
          this.billingForm.patchValue(user.billingInfo);
        }
      });

    // Load cart
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cart = cart;
      this.isLoading = false;

      // Redirect to home if cart is empty
      if (cart.itemCount === 0 && !this.isLoading) {
        this.router.navigate(["/"]);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize forms
   */
  private initializeForms(): void {
    // Billing form with custom validators
    this.billingForm = this.fb.group({
      address: [
        "",
        [Validators.required, this.addressValidator],
      ],
      city: [
        "",
        [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern(/^[a-zA-Z\s]+$/),
        ],
      ],
      zipCode: [
        "",
        [Validators.required, Validators.pattern(/^\d{5}$/)],
      ],
      phone: [
        "",
        [Validators.required, Validators.pattern(/^0\d{1,2}-\d{7}$/)],
      ],
    });

    // Payment form
    this.paymentForm = this.fb.group({
      paymentMethod: ["", Validators.required],
      cardholderName: [""],
      cardType: [""],
      cardNumber: [""],
      expiryMonth: [""],
      expiryYear: [""],
      cvv: [""],
    });

    // Add dynamic validators for credit card fields
    this.paymentForm.get("paymentMethod")?.valueChanges.subscribe((method) => {
      this.updatePaymentValidators(method);
    });
  }

  /**
   * Custom validator for address
   */
  private addressValidator(control: any): any {
    const value = control.value;
    if (!value) return null;

    // Check for at least one word with 3+ letters and at least one digit
    const hasWord = /[a-zA-Z]{3,}/.test(value);
    const hasNumber = /\d/.test(value);

    return hasWord && hasNumber ? null : { invalidAddress: true };
  }

  /**
   * Update payment validators based on method
   */
  private updatePaymentValidators(method: string): void {
    const cardholderName = this.paymentForm.get("cardholderName");
    const cardType = this.paymentForm.get("cardType");
    const cardNumber = this.paymentForm.get("cardNumber");
    const expiryMonth = this.paymentForm.get("expiryMonth");
    const expiryYear = this.paymentForm.get("expiryYear");
    const cvv = this.paymentForm.get("cvv");

    if (method === "credit_card") {
      // Add validators for credit card
      cardholderName?.setValidators([
        Validators.required,
        Validators.pattern(/^[a-zA-Z]{2,}\s+[a-zA-Z]{2,}.*$/),
      ]);
      cardType?.setValidators([Validators.required]);
      cardNumber?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{16}$/),
      ]);
      expiryMonth?.setValidators([Validators.required]);
      expiryYear?.setValidators([Validators.required]);
      cvv?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{3}$/),
      ]);
    } else {
      // Clear validators for check payment
      cardholderName?.clearValidators();
      cardType?.clearValidators();
      cardNumber?.clearValidators();
      expiryMonth?.clearValidators();
      expiryYear?.clearValidators();
      cvv?.clearValidators();
    }

    // Update validation status
    cardholderName?.updateValueAndValidity();
    cardType?.updateValueAndValidity();
    cardNumber?.updateValueAndValidity();
    expiryMonth?.updateValueAndValidity();
    expiryYear?.updateValueAndValidity();
    cvv?.updateValueAndValidity();
  }

  /**
   * Generate years for credit card expiry
   */
  private generateYears(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 20; i++) {
      this.years.push(currentYear + i);
    }
  }

  /**
   * Handle billing form submission
   */
  onBillingSubmit(): void {
    if (this.billingForm.invalid) {
      Object.keys(this.billingForm.controls).forEach((key) => {
        this.billingForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Store billing info
    this.billingInfo = {
      ...this.billingForm.value,
      firstName: this.currentUser?.firstName || "",
      lastName: this.currentUser?.lastName || "",
    };

    // Move to payment step
    this.currentStep = CheckoutStep.PAYMENT;
  }

  /**
   * Handle payment form submission
   */
  onPaymentSubmit(): void {
    if (!this.isPaymentValid()) {
      Object.keys(this.paymentForm.controls).forEach((key) => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      return;
    }

    // Store payment info
    const formValue = this.paymentForm.value;
    this.paymentInfo = {
      method: formValue.paymentMethod,
      cardholderName: formValue.cardholderName,
      cardType: formValue.cardType,
      lastFourDigits: formValue.cardNumber?.slice(-4),
      expiryMonth: formValue.expiryMonth,
      expiryYear: formValue.expiryYear,
    };

    // Move to review step
    this.currentStep = CheckoutStep.REVIEW;
  }

  /**
   * Check if payment form is valid
   */
  isPaymentValid(): boolean {
    const method = this.paymentForm.get("paymentMethod")?.value;
    if (!method) return false;

    if (method === "check") {
      return true;
    }

    return this.paymentForm.valid;
  }

  /**
   * Select payment method
   */
  selectPaymentMethod(method: string): void {
    this.paymentForm.patchValue({ paymentMethod: method });
  }

  /**
   * Change to a specific step
   */
  changeStep(step: CheckoutStep): void {
    this.currentStep = step;
  }

  /**
   * Place the order
   */
  placeOrder(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;

    // Prepare order data
    const orderData: CreateOrderRequest = {
      paymentMethod:
        this.paymentInfo.method === "check"
          ? PaymentMethod.CHECK
          : PaymentMethod.CREDIT_CARD,
      paymentInfo:
        this.paymentInfo.method === "check"
          ? { checkNumber: "CHECK-" + Date.now() }
          : {
              cardType: this.paymentForm.value.cardType,
              cardNumber: this.paymentForm.value.cardNumber,
              cardholderName: this.paymentForm.value.cardholderName,
              expiryMonth: this.paymentForm.value.expiryMonth,
              expiryYear: this.paymentForm.value.expiryYear,
              cvv: this.paymentForm.value.cvv,
            },
      billingInfo: this.billingForm.value,
    };

    // Create order
    this.orderService.createOrder(orderData).subscribe({
      next: (order: Order) => {
        // Clear cart
        this.cartService.clearCart().subscribe(() => {
          // Navigate to success page or home
          this.router.navigate(["/my-account"], {
            queryParams: { orderId: order._id },
          });
        });
      },
      error: (error: any) => {
        console.error("Order failed:", error);
        this.isProcessing = false;
        // Show error message (could use a toast service)
        alert("Failed to place order. Please try again.");
      },
    });
  }

  /**
   * Format price
   */
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  /**
   * Get card type display name
   */
  getCardTypeDisplay(): string {
    switch (this.paymentInfo?.cardType) {
      case "visa":
        return "Visa";
      case "mastercard":
        return "MasterCard";
      case "direct":
        return "Direct";
      default:
        return "";
    }
  }
}