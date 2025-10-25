import { Component } from "@angular/core";
import { CommonModule, Location } from "@angular/common";
import { Router, RouterModule } from "@angular/router";

@Component({
  selector: "app-not-found",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./not-found.component.html",
  styleUrls: ["./not-found.component.css"],
})
export class NotFoundComponent {
  constructor(private router: Router, private location: Location) {}

  /**
   * GoHome
   * 
   * Navigates to home page
   *
   * @return void
   */
  goHome(): void {
    this.router.navigate(["/"]);
  }

  /**
   * GoBack
   * 
   * Navigates to previous page in browser history
   *
   * @return void
   */
  goBack(): void {
    this.location.back();
  }
}