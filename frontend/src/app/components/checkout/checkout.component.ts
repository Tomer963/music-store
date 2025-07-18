import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-checkout",
  standalone: true,
  imports: [CommonModule],
  template: "<div>Checkout Page</div>",
  styles: [`
    div {
      padding: 20px;
      text-align: center;
      font-size: 24px;
    }
  `]
})
export class CheckoutComponent {}