/**
 * Checkout Component
 * Handles the complete checkout process
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { CartService } from "../../services/cart.service";
import { OrderService } from "../../services/order.service";
import { AlbumService } from "../../services/album.service";
import { Cart, CartItem } from "../../models/cart.model";
import { CheckoutStep, PaymentMethod } from "../../models/order.model";
import { SpinnerComponent } from "../shared/spinner/spinner.component";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, SpinnerComponent],
  templateUrl: "./checkout.component.html",
  styleUrls: ["./checkout.component.css"],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  currentStep: CheckoutStep = CheckoutStep.BILLING;
  paymentMethod: PaymentMethod = PaymentMethod.CREDIT_CARD;
  
  billingForm!: FormGroup;
  creditCardForm!: FormGroup;
  checkForm!: FormGroup;
  
  isLoading = true;
  isProcessing = false;
  orderSuccess = false;
  orderNumber = '';
  
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private orderService: OrderService,
    private albumService: AlbumService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize all forms
   */
  private initializeForms(): void {
    // Billing form
    this.billingForm = this.fb.group({
      address: ['', [Validators.required, Validators.pattern(/^.{3,}.*\d+/)]],
      city: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]{3,}$/)]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^0\d{1,2}-\d{7}$/)]],
    });

    // Credit card form
    this.creditCardForm = this.fb.group({
      cardType: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      cardholderName: ['', Validators.required],
      expiryMonth: ['', Validators.required],
      expiryYear: ['', Validators.required],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
    });

    // Check form
    this.checkForm = this.fb.group({
      checkNumber: ['', Validators.required],
    });
  }

  /**
   * Load cart data
   */
  private loadCart(): void {
    this.cartService.cart$
      .pipe(takeUntil(this.destroy$))
      .subscribe((cart) => {
        this.cart = cart;
        this.isLoading = false;
      });
  }

  /**
   * Handle payment method change
   */
  onPaymentMethodChange(): void {
    // Reset forms when changing payment method
    this.creditCardForm.reset();
    this.checkForm.reset();
  }

  /**
   * Go to next step
   */
  nextStep(): void {
    if (this.currentStep === CheckoutStep.BILLING && this.billingForm.valid) {
      this.currentStep = CheckoutStep.PAYMENT;
    } else if (this.currentStep === CheckoutStep.PAYMENT) {
      if (this.paymentMethod === PaymentMethod.CREDIT_CARD && this.creditCardForm.valid) {
        this.currentStep = CheckoutStep.REVIEW;
      } else if (this.paymentMethod === PaymentMethod.CHECK && this.checkForm.valid) {
        this.currentStep = CheckoutStep.REVIEW;
      }
    }
  }

  /**
   * Go to previous step
   */
  previousStep(): void {
    if (this.currentStep > CheckoutStep.BILLING) {
      this.currentStep--;
    }
  }

  /**
   * Place order
   */
  placeOrder(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;

    const orderData = {
      paymentMethod: this.paymentMethod,
      paymentInfo: this.paymentMethod === PaymentMethod.CREDIT_CARD
        ? {
            cardType: this.creditCardForm.value.cardType,
            cardNumber: this.creditCardForm.value.cardNumber,
            cardholderName: this.creditCardForm.value.cardholderName,
            expiryMonth: this.creditCardForm.value.expiryMonth,
            expiryYear: this.creditCardForm.value.expiryYear,
            cvv: this.creditCardForm.value.cvv,
          }
        : {
            checkNumber: this.checkForm.value.checkNumber,
          },
      billingInfo: this.billingForm.value,
    };

    this.orderService.createOrder(orderData).subscribe({
      next: (order) => {
        this.orderNumber = order.orderNumber;
        this.orderSuccess = true;
        this.isProcessing = false;
        // Clear cart is handled by the backend
      },
      error: (error) => {
        console.error('Order failed:', error);
        this.isProcessing = false;
        // Show error message (could use a toast service)
        alert('Failed to place order. Please try again.');
      },
    });
  }

  /**
   * Get album image URL
   */
  getImageUrl(item: CartItem): string {
    return this.albumService.getMainImageUrl(item.album);
  }

  /**
   * Format price
   */
  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  /**
   * Enum getters for template
   */
  get CheckoutStep() {
    return CheckoutStep;
  }

  get PaymentMethod() {
    return PaymentMethod;
  }
}