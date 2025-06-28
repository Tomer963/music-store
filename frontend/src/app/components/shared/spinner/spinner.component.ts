/**
 * Spinner Component
 * Loading indicator with customizable size
 */

import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-spinner",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./spinner.component.html",
  styleUrls: ["./spinner.component.css"],
})
export class SpinnerComponent {
  @Input() size: "small" | "medium" | "large" = "medium";
  @Input() color: string = "primary";
  @Input() text?: string;
}
