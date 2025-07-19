/**
 * Checkout Component
 * Multi-step checkout process matching the mockup design
 */

import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { CartService } from "../../services/cart.service";
import { OrderService } from "../../services/order.service";
import { AlbumService } from "../../services/album.service";
import { Cart } from "../../models/cart.model";
import { SpinnerComponent } from "../shared/spinner/spinner.component";

interface CheckoutProgress {
  currentStep: number;
  completed: boolean[];
  steps: string[];
}

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: "./checkout.component.html",
  styleUrls: ["./checkout.component.css"],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  billingForm!: FormGroup;
  paymentForm!: FormGroup;
  
  progress: CheckoutProgress = {
    currentStep: 1,
    completed: [false, false, false],
    steps: ["Billing Information", "Payment Method", "Order Review"]
  };

  isLoading = true;
  isSubmitting = false;
  orderPlaced = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private orderService: OrderService,
    private albumService: AlbumService,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.billingForm = this.fb.group({
      address: ['', [Validators.required, Validators.pattern(/^.{3,}.*\d+/)]],
      city: ['', [Validators.required, Validators.pattern(/^[a-zA-Z\s]{3,}$/)]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^0\d{1,2}-\d{7}$/)]]
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['credit_card', Validators.required],
      cardType: [''],
      cardNumber: [''],
      cardholderName: [''],
      expiryMonth: [''],
      expiryYear: [''],
      cvv: [''],
      checkNumber: ['']
    });

    // Set up conditional validators
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(method => {
      this.updatePaymentValidators(method);
    });

    // Initialize with credit card validators
    this.updatePaymentValidators('credit_card');
  }

  private updatePaymentValidators(method: string): void {
    const cardType = this.paymentForm.get('cardType');
    const cardNumber = this.paymentForm.get('cardNumber');
    const cardholderName = this.paymentForm.get('cardholderName');
    const expiryMonth = this.paymentForm.get('expiryMonth');
    const expiryYear = this.paymentForm.get('expiryYear');
    const cvv = this.paymentForm.get('cvv');
    const checkNumber = this.paymentForm.get('checkNumber');

    // Clear all validators first
    [cardType, cardNumber, cardholderName, expiryMonth, expiryYear, cvv, checkNumber].forEach(control => {
      control?.clearValidators();
      control?.updateValueAndValidity();
    });

    if (method === 'credit_card') {
      cardType?.setValidators([Validators.required]);
      cardNumber?.setValidators([Validators.required, Validators.pattern(/^\d{16}$/)]);
      cardholderName?.setValidators([Validators.required]);
      expiryMonth?.setValidators([Validators.required, Validators.min(1), Validators.max(12)]);
      expiryYear?.setValidators([Validators.required, Validators.min(new Date().getFullYear())]);
      cvv?.setValidators([Validators.required, Validators.pattern(/^\d{3}$/)]);
    } else if (method === 'check') {
      checkNumber?.setValidators([Validators.required]);
    }

    // Update validity
    [cardType, cardNumber, cardholderName, expiryMonth, expiryYear, cvv, checkNumber].forEach(control => {
      control?.updateValueAndValidity();
    });
  }

  private loadCart(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe(cart => {
      this.cart = cart;
      this.isLoading = false;
      
      // Redirect if cart is empty
      if (cart.itemCount === 0) {
        this.router.navigate(['/']);
      }
    });
  }

  nextStep(): void {
    if (this.progress.currentStep < 3) {
      if (this.validateCurrentStep()) {
        this.progress.completed[this.progress.currentStep - 1] = true;
        this.progress.currentStep++;
      }
    }
  }

  previousStep(): void {
    if (this.progress.currentStep > 1) {
      this.progress.currentStep--;
    }
  }

  goToStep(step: number): void {
    // Allow navigation only to current step or previous completed steps
    if (step === this.progress.currentStep) {
      return; // Already on this step
    }
    
    if (step < this.progress.currentStep) {
      // Going back to a previous step
      this.progress.currentStep = step;
    } else if (step === this.progress.currentStep + 1 && this.progress.completed[step - 2]) {
      // Going to next step if previous step is completed
      this.progress.currentStep = step;
    }
  }

  public validateCurrentStep(): boolean {
    switch (this.progress.currentStep) {
      case 1:
        return this.billingForm.valid;
      case 2:
        return this.paymentForm.valid;
      case 3:
        return true;
      default:
        return false;
    }
  }

  placeOrder(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.isSubmitting = true;

    const orderData = {
      paymentMethod: this.paymentForm.value.paymentMethod,
      paymentInfo: this.getPaymentInfo(),
      billingInfo: this.billingForm.value
    };

    // Simulate API call
    setTimeout(() => {
      this.orderPlaced = true;
      this.isSubmitting = false;
      this.cartService.clearCart().subscribe();
    }, 2000);
  }

  private getPaymentInfo(): any {
    const method = this.paymentForm.value.paymentMethod;
    
    if (method === 'credit_card') {
      return {
        cardType: this.paymentForm.value.cardType,
        cardNumber: this.paymentForm.value.cardNumber,
        cardholderName: this.paymentForm.value.cardholderName,
        expiryMonth: parseInt(this.paymentForm.value.expiryMonth),
        expiryYear: parseInt(this.paymentForm.value.expiryYear),
        cvv: this.paymentForm.value.cvv
      };
    } else {
      return {
        checkNumber: this.paymentForm.value.checkNumber
      };
    }
  }

  getImageUrl(item: any): string {
    return this.albumService.getMainImageUrl(item.album);
  }

  formatPrice(price: number): string {
    return this.albumService.formatPrice(price);
  }

  getItemTotal(item: any): string {
    const total = item.album.price * item.quantity;
    return this.formatPrice(total);
  }

  continueShopping(): void {
    this.router.navigate(['/']);
  }
}