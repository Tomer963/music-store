import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { CartService } from "../../services/cart.service";
import { OrderService } from "../../services/order.service";
import { Cart } from "../../models/cart.model";
import { User } from "../../models/user.model";
import { SpinnerComponent } from "../shared/spinner/spinner.component";

// ✅ קבוע - כל החודשים
const ALL_MONTHS = [
  { value: "01", label: "01 - January" },
  { value: "02", label: "02 - February" },
  { value: "03", label: "03 - March" },
  { value: "04", label: "04 - April" },
  { value: "05", label: "05 - May" },
  { value: "06", label: "06 - June" },
  { value: "07", label: "07 - July" },
  { value: "08", label: "08 - August" },
  { value: "09", label: "09 - September" },
  { value: "10", label: "10 - October" },
  { value: "11", label: "11 - November" },
  { value: "12", label: "12 - December" },
];

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: "./checkout.component.html",
  styleUrls: ["./checkout.component.css"],
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cart: Cart = { items: [], itemCount: 0, total: 0 };
  currentStep = 1;
  billingForm!: FormGroup;
  paymentForm!: FormGroup;
  isLoading = true;
  isProcessing = false;
  hasItems = false;
  isAuthenticated = false;
  highestStepReached = 1;
  currentUser: User | null = null;
  currentUserId: string = '';

  billingFormSubmitted = false;
  paymentFormSubmitted = false;

  private destroy$ = new Subject<void>();
  private readonly CHECKOUT_STORAGE_KEY = "checkout_form_data";
  private readonly CHECKOUT_STEP_KEY = "checkout_current_step";
  private readonly HIGHEST_STEP_KEY = "checkout_highest_step";
  private readonly FORM_TIMESTAMP_KEY = "checkout_form_timestamp";
  private readonly CHECKOUT_USER_KEY = "checkout_user_id";
  private readonly FORM_EXPIRY = 30 * 60 * 1000;

  billingInfo = {
    address: "",
    city: "",
    zipCode: "",
    phone: "",
  };

  // ✅ רשימות דינמיות
  months: typeof ALL_MONTHS = [...ALL_MONTHS];
  years: number[] = [];
  readonly CURRENT_YEAR = new Date().getFullYear();
  readonly CURRENT_MONTH = new Date().getMonth() + 1;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.isAuthenticated = this.authService.isAuthenticated();
      this.currentUser = this.authService.getCurrentUser();
      this.currentUserId = this.currentUser?._id || '';

      if (!this.isAuthenticated) {
        this.authService.saveReturnUrl("/checkout");
        this.router.navigate(["/login"], {
          queryParams: { returnUrl: "/checkout" },
        });
        return;
      }

      this.initializeForms();
      
      this.checkUserChange();
      
      this.loadSavedFormData();
      this.loadCartData();

      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe((user) => {
          const wasAuthenticated = this.isAuthenticated;
          const previousUserId = this.currentUserId;
          
          this.isAuthenticated = !!user;
          this.currentUser = user;
          this.currentUserId = user?._id || '';

          if (!this.isAuthenticated && wasAuthenticated) {
            this.clearAllCheckoutData();
            this.authService.saveReturnUrl("/checkout");
            this.router.navigate(["/login"], {
              queryParams: { returnUrl: "/checkout" },
            });
          }
          
          if (this.isAuthenticated && previousUserId && this.currentUserId && previousUserId !== this.currentUserId) {
            this.clearAllCheckoutData();
            this.resetToStep1();
          }
        });
    }, 0);
  }

  ngOnDestroy(): void {
    this.saveFormData();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * ✅ בדוק אם המשתמש השתנה
   */
  private checkUserChange(): void {
    const savedUserId = sessionStorage.getItem(this.CHECKOUT_USER_KEY);
    
    if (savedUserId && this.currentUserId && savedUserId !== this.currentUserId) {
      this.clearAllCheckoutData();
    }
    
    if (this.currentUserId) {
      sessionStorage.setItem(this.CHECKOUT_USER_KEY, this.currentUserId);
    }
  }

  /**
   * ✅ נקה את כל הנתונים של checkout
   */
  private clearAllCheckoutData(): void {
    this.clearSavedFormData();
    this.resetForms();
    this.currentStep = 1;
    this.highestStepReached = 1;
    this.billingFormSubmitted = false;
    this.paymentFormSubmitted = false;
  }

  /**
   * ✅ איפוס טפסים
   */
  private resetForms(): void {
    if (this.billingForm) {
      this.billingForm.reset({
        address: '',
        city: '',
        zipCode: '',
        phone: ''
      });
    }
    
    if (this.paymentForm) {
      this.paymentForm.reset({
        paymentMethod: 'check',
        cardType: '',
        cardNumber: '',
        cardholderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: ''
      });
    }
    
    this.billingInfo = {
      address: '',
      city: '',
      zipCode: '',
      phone: ''
    };
  }

  /**
   * ✅ חזור לשלב 1
   */
  private resetToStep1(): void {
    this.currentStep = 1;
    this.highestStepReached = 1;
    this.billingFormSubmitted = false;
    this.paymentFormSubmitted = false;
    this.saveFormData();
  }

  private loadCartData(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe((cart) => {
      this.cart = cart;
      this.hasItems = cart.itemCount > 0;
      
      if (!this.hasItems) {
        this.clearAllCheckoutData();
      }
      
      this.isLoading = false;
    });

    this.cartService.refreshCart().subscribe({
      error: () => this.isLoading = false,
    });
  }

  initializeForms(): void {
    this.initializeYears();

    this.billingForm = this.fb.group({
      address: ["", [Validators.required, this.addressValidator]],
      city: ["", [Validators.required, this.cityValidator]],
      zipCode: ["", [Validators.required, this.zipCodeValidator]],
      phone: ["", [Validators.required, this.phoneValidator]],
    });

    this.billingForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((values) => {
        this.billingInfo = { ...values };
        this.saveFormData();
      });

    this.paymentForm = this.fb.group({
      paymentMethod: ["check", Validators.required],
      cardType: [""],
      cardNumber: [""],
      cardholderName: [""],
      expiryMonth: [""],
      expiryYear: [""],
      cvv: [""],
    });

    this.setupPaymentValidators();
    this.paymentForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.saveFormData());

    this.setupExpiryListeners();
  }

  /**
   * ✅ אתחול רשימת שנים
   */
  private initializeYears(): void {
    const startYear = this.CURRENT_YEAR;
    const yearCount = 20;
    this.years = Array.from({ length: yearCount }, (_, i) => startYear + i);
  }

  /**
   * ✅ הגדרת מאזינים לשינויים בתאריכי תפוגה
   */
  private setupExpiryListeners(): void {
    this.paymentForm
      .get("expiryMonth")
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAvailableMonthsAndYears();
      });

    this.paymentForm
      .get("expiryYear")
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateAvailableMonthsAndYears();
      });
  }

  /**
   * ✅ עדכון חודשים ושנים זמינות
   */
  private updateAvailableMonthsAndYears(): void {
    const selectedMonth = this.paymentForm.get("expiryMonth")?.value;
    const selectedYear = this.paymentForm.get("expiryYear")?.value;

    if (!selectedMonth && !selectedYear) {
      this.months = [...ALL_MONTHS];
      this.initializeYears();
      return;
    }

    if (selectedYear && !selectedMonth) {
      const yearNum = parseInt(selectedYear, 10);

      if (yearNum === this.CURRENT_YEAR) {
        this.months = ALL_MONTHS.filter((m) => {
          const monthNum = parseInt(m.value, 10);
          return monthNum >= this.CURRENT_MONTH;
        });
      } else {
        this.months = [...ALL_MONTHS];
      }
      return;
    }

    if (selectedMonth && !selectedYear) {
      const monthNum = parseInt(selectedMonth, 10);

      if (monthNum < this.CURRENT_MONTH) {
        this.years = Array.from(
          { length: 20 },
          (_, i) => this.CURRENT_YEAR + 1 + i
        );
      } else {
        this.initializeYears();
      }
      return;
    }

    if (selectedMonth && selectedYear) {
      const monthNum = parseInt(selectedMonth, 10);
      const yearNum = parseInt(selectedYear, 10);

      if (yearNum === this.CURRENT_YEAR && monthNum < this.CURRENT_MONTH) {
        this.paymentForm.patchValue(
          { expiryMonth: "", expiryYear: "" },
          { emitEvent: false }
        );

        this.months = [...ALL_MONTHS];
        this.initializeYears();
      } else {
        if (yearNum === this.CURRENT_YEAR) {
          this.months = ALL_MONTHS.filter((m) => {
            const mNum = parseInt(m.value, 10);
            return mNum >= this.CURRENT_MONTH;
          });
        } else {
          this.months = [...ALL_MONTHS];
        }

        if (monthNum < this.CURRENT_MONTH) {
          this.years = Array.from(
            { length: 20 },
            (_, i) => this.CURRENT_YEAR + 1 + i
          );
        } else {
          this.initializeYears();
        }
      }
    }
  }

  setupPaymentValidators(): void {
    const paymentMethodControl = this.paymentForm.get("paymentMethod");

    paymentMethodControl?.valueChanges.subscribe((method) => {
      const controls = [
        "cardType",
        "cardNumber",
        "cardholderName",
        "expiryMonth",
        "expiryYear",
        "cvv",
      ];

      if (method === "credit_card") {
        this.paymentForm
          .get("cardType")
          ?.setValidators([Validators.required, this.cardTypeValidator]);
        this.paymentForm
          .get("cardNumber")
          ?.setValidators([
            Validators.required,
            Validators.pattern(/^\d{16}$/),
            this.cardNumberValidator,
          ]);
        this.paymentForm
          .get("cardholderName")
          ?.setValidators([Validators.required, this.cardholderNameValidator]);
        this.paymentForm
          .get("expiryMonth")
          ?.setValidators([Validators.required]);
        this.paymentForm
          .get("expiryYear")
          ?.setValidators([Validators.required]);
        this.paymentForm
          .get("cvv")
          ?.setValidators([
            Validators.required,
            Validators.pattern(/^\d{3}$/),
            this.cvvValidator,
          ]);
      } else {
        controls.forEach((control) => {
          this.paymentForm.get(control)?.clearValidators();
          this.paymentForm.get(control)?.setValue("");
        });
      }

      controls.forEach((control) =>
        this.paymentForm.get(control)?.updateValueAndValidity()
      );
    });
  }

  /**
   * ✅ Address Validator - מתוקן
   */
  private addressValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;

    // בדיקה שיש לפחות מילה אחת עם 3 אותיות ומספר אחד
    const hasThreeLetters = /[a-zA-Zא-ת]{3,}/.test(value);
    const hasDigit = /\d/.test(value);

    if (!hasThreeLetters || !hasDigit) {
      return { invalidAddress: true };
    }

    return null;
  }

  private cityValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    return /^[a-zA-Z\s]{3,}$/.test(value) ? null : { invalidCity: true };
  }

  /**
   * ✅ Zip Code Validator - מתוקן
   */
  private zipCodeValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    // מאפשר 5 או 7 ספרות
    return /^\d{5}$|^\d{7}$/.test(value) ? null : { invalidZipCode: true };
  }

  private phoneValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    return /^0\d{1,2}-\d{7}$/.test(value) ? null : { invalidPhone: true };
  }

  private cardholderNameValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;

    const words = value.trim().split(/\s+/);
    if (words.length < 2) return { invalidCardholderName: true };

    for (const word of words) {
      if (!/^[\p{L}]{2,}$/u.test(word)) {
        return { invalidCardholderName: true };
      }
    }

    return null;
  }

  private cardTypeValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value || value === "") return { invalidCardType: true };
    return null;
  }

  private cardNumberValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    if (!/^\d{16}$/.test(value)) return { invalidCardNumber: true };
    return null;
  }

  private cvvValidator(
    control: AbstractControl
  ): { [key: string]: boolean } | null {
    const value = control.value;
    if (!value) return null;
    if (!/^\d{3}$/.test(value)) return { invalidCvv: true };
    return null;
  }

  /**
   * Form Data Management
   */
  private saveFormData(): void {
    try {
      const formData = {
        billing: this.billingForm.value,
        payment: this.paymentForm.value,
        billingInfo: this.billingInfo,
        currentStep: this.currentStep,
        highestStepReached: this.highestStepReached,
        timestamp: Date.now(),
        userId: this.currentUserId,
      };
      sessionStorage.setItem(
        this.CHECKOUT_STORAGE_KEY,
        JSON.stringify(formData)
      );
      sessionStorage.setItem(
        this.CHECKOUT_STEP_KEY,
        this.currentStep.toString()
      );
      sessionStorage.setItem(
        this.HIGHEST_STEP_KEY,
        this.highestStepReached.toString()
      );
      sessionStorage.setItem(this.FORM_TIMESTAMP_KEY, Date.now().toString());
      
      if (this.currentUserId) {
        sessionStorage.setItem(this.CHECKOUT_USER_KEY, this.currentUserId);
      }
    } catch (error) {
      console.error("Failed to save form data");
    }
  }

  private loadSavedFormData(): void {
    try {
      const savedData = sessionStorage.getItem(this.CHECKOUT_STORAGE_KEY);
      const savedStep = sessionStorage.getItem(this.CHECKOUT_STEP_KEY);
      const savedHighestStep = sessionStorage.getItem(this.HIGHEST_STEP_KEY);
      const savedTimestamp = sessionStorage.getItem(this.FORM_TIMESTAMP_KEY);

      if (savedData && savedTimestamp) {
        const timestamp = parseInt(savedTimestamp, 10);
        const now = Date.now();

        if (now - timestamp > this.FORM_EXPIRY) {
          this.clearSavedFormData();
          return;
        }

        const formData = JSON.parse(savedData);
        
        if (formData.userId && this.currentUserId && formData.userId !== this.currentUserId) {
          this.clearSavedFormData();
          return;
        }

        if (formData.billing) {
          this.billingForm.patchValue(formData.billing);
          this.billingInfo = { ...formData.billingInfo };
        }

        if (formData.payment) {
          this.paymentForm.patchValue(formData.payment);
          this.setupPaymentValidators();
          this.updateAvailableMonthsAndYears();
        }

        if (savedHighestStep) {
          this.highestStepReached = parseInt(savedHighestStep);
        } else if (formData.highestStepReached) {
          this.highestStepReached = formData.highestStepReached;
        }

        if (savedStep) {
          const step = parseInt(savedStep);

          if (step === 1) {
            this.currentStep = 1;
          } else if (step === 2) {
            if (this.billingForm.valid) {
              this.currentStep = 2;
            } else {
              this.currentStep = 1;
            }
          } else if (step === 3) {
            if (this.billingForm.valid && this.paymentForm.valid) {
              this.currentStep = 3;
            } else if (this.billingForm.valid) {
              this.currentStep = 2;
            } else {
              this.currentStep = 1;
            }
          }
        }
      }
    } catch (error) {
      this.clearSavedFormData();
    }
  }

  private clearSavedFormData(): void {
    sessionStorage.removeItem(this.CHECKOUT_STORAGE_KEY);
    sessionStorage.removeItem(this.CHECKOUT_STEP_KEY);
    sessionStorage.removeItem(this.HIGHEST_STEP_KEY);
    sessionStorage.removeItem(this.FORM_TIMESTAMP_KEY);
    sessionStorage.removeItem(this.CHECKOUT_USER_KEY);
    this.highestStepReached = 1;
  }

  updateFormField(fieldName: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value;

    if (fieldName === "cardNumber" || fieldName === "cvv") {
      const numericValue = value.replace(/\D/g, "");
      this.paymentForm.get(fieldName)?.setValue(numericValue);
      target.value = numericValue;
    } else {
      this.paymentForm.get(fieldName)?.setValue(value);
    }

    this.saveFormData();
  }

  onPaymentMethodChange(method: string): void {
    this.paymentForm.patchValue({ paymentMethod: method });

    if (method === "check") {
      [
        "cardType",
        "cardNumber",
        "cardholderName",
        "expiryMonth",
        "expiryYear",
        "cvv",
      ].forEach((field) => this.paymentForm.patchValue({ [field]: "" }));
    }
  }

  continueToNextStep(): void {
    if (!this.hasItems) {
      return;
    }

    const forms = [null, this.billingForm, this.paymentForm];
    const currentForm = forms[this.currentStep];

    if (currentForm && currentForm.valid) {
      if (this.currentStep === 1) {
        this.billingFormSubmitted = false;
      } else if (this.currentStep === 2) {
        this.paymentFormSubmitted = false;
      }

      this.currentStep++;

      if (this.currentStep > this.highestStepReached) {
        this.highestStepReached = this.currentStep;
      }

      this.saveFormData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentForm) {
      if (this.currentStep === 1) {
        this.billingFormSubmitted = true;
      } else if (this.currentStep === 2) {
        this.paymentFormSubmitted = true;
      }

      Object.keys(currentForm.controls).forEach((key) =>
        currentForm.get(key)?.markAsTouched()
      );
    }
  }

  changeStep(step: number): void {
    if (step < 1 || step > 3) {
      return;
    }

    if (step === 1) {
      this.currentStep = 1;
      this.billingFormSubmitted = false;
      this.saveFormData();
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
      return;
    }

    if (step === 2) {
      if (this.billingForm.valid) {
        this.currentStep = 2;
        this.paymentFormSubmitted = false;

        if (this.currentStep > this.highestStepReached) {
          this.highestStepReached = this.currentStep;
        }

        this.saveFormData();
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      } else {
        this.billingFormSubmitted = true;
        Object.keys(this.billingForm.controls).forEach((key) =>
          this.billingForm.get(key)?.markAsTouched()
        );
      }
      return;
    }

    if (step === 3) {
      if (this.billingForm.valid && this.paymentForm.valid) {
        this.currentStep = 3;

        if (this.currentStep > this.highestStepReached) {
          this.highestStepReached = this.currentStep;
        }

        this.saveFormData();
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      } else {
        if (!this.billingForm.valid) {
          this.billingFormSubmitted = true;
          Object.keys(this.billingForm.controls).forEach((key) =>
            this.billingForm.get(key)?.markAsTouched()
          );
        } else if (!this.paymentForm.valid) {
          this.paymentFormSubmitted = true;
          Object.keys(this.paymentForm.controls).forEach((key) =>
            this.paymentForm.get(key)?.markAsTouched()
          );
        }
      }
    }
  }

  submitOrder(): void {
    if (!this.hasItems) {
      return;
    }

    if (!this.billingForm.valid || !this.paymentForm.valid) {
      return;
    }

    this.isProcessing = true;

    const paymentMethod = this.paymentForm.get("paymentMethod")?.value;
    
    const orderData: any = {
      billingInfo: this.billingForm.value,
      paymentMethod: paymentMethod,
      totalAmount: this.cart.total,
    };

    this.orderService.createOrder(orderData).subscribe({
      next: () => {
        this.isProcessing = false;
        
        this.clearAllCheckoutData();
        
        this.cartService.clearCart().subscribe();
        setTimeout(() => this.router.navigate(["/my-account"]), 500);
      },
      error: (error) => {
        this.isProcessing = false;
        console.error('Order creation error:', error);
        
        const errorMessage = error.error?.message || 'Failed to create order. Please try again.';
        alert(errorMessage);
      },
    });
  }

  editCart(event: Event): void {
    event.preventDefault();
    this.saveFormData();
    this.router.navigate(["/"]);
  }

  goShopping(): void {
    this.router.navigate(["/"]);
  }

  shouldShowError(
    form: FormGroup,
    fieldName: string,
    formSubmitted: boolean
  ): boolean {
    const control = form.get(fieldName);
    if (!control) return false;
    return formSubmitted && control.invalid && control.touched;
  }

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
    if (!control || !control.errors) return "";

    if (control.errors["required"]) return "This is a required field";

    const errorMessages: { [key: string]: string } = {
      address: "Address must contain at least one word with 3 letters and at least one digit (e.g., 'Herzl 34', 'King George 5')",
      city: "City must contain only letters in English and be at least 3 characters",
      zipCode: "Zip code must be 5 or 7 digits",
      phone: "Phone format: 03-6381414 or 050-1112222",
      cardType: "Please select a card type",
      cardNumber: "Card number must be exactly 16 digits",
      cardholderName:
        "Name must contain at least two words with minimum 2 letters each",
      expiryMonth: "Please select expiration month",
      expiryYear: "Please select expiration year",
      cvv: "CVV must be exactly 3 digits",
    };

    if (field === "cardType" && control.errors["invalidCardType"]) {
      return errorMessages["cardType"];
    }

    if (field === "cardholderName" && control.errors["invalidCardholderName"]) {
      return errorMessages["cardholderName"];
    }

    if (
      field === "cardNumber" &&
      (control.errors["invalidCardNumber"] || control.errors["pattern"])
    ) {
      return errorMessages["cardNumber"];
    }

    if (
      field === "cvv" &&
      (control.errors["invalidCvv"] || control.errors["pattern"])
    ) {
      return errorMessages["cvv"];
    }

    return errorMessages[field] || "Invalid input";
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  getCardTypeName(type: string): string {
    const types: { [key: string]: string } = {
      visa: "Visa",
      mastercard: "MasterCard",
      direct: "Direct",
    };
    return types[type] || "";
  }

  getCityZip(): string {
    const parts: string[] = [];
    
    if (this.billingInfo.city) {
      parts.push(this.billingInfo.city);
    }
    
    if (this.billingInfo.zipCode) {
      parts.push(this.billingInfo.zipCode);
    }
    
    return parts.join(', ');
  }

  getPhoneFormatted(): string {
    if (this.billingInfo.phone) {
      return `T: ${this.billingInfo.phone}`;
    }
    return "";
  }

  getUserFullName(): string {
    if (this.currentUser) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return "";
  }

  isStepActive(step: number): boolean {
    return this.currentStep === step;
  }

  isStepCompleted(step: number): boolean {
    return this.currentStep > step;
  }

  isStepDisabled(step: number): boolean {
    return this.currentStep < step;
  }

  isStepCollapsed(step: number): boolean {
    return this.currentStep > step;
  }

  hasReachedStep(step: number): boolean {
    return this.highestStepReached >= step;
  }

  hasBillingInfo(): boolean {
    return !!this.billingInfo.address;
  }

  hasPaymentInfo(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    return this.highestStepReached >= 2 && !!paymentMethod;
  }
}