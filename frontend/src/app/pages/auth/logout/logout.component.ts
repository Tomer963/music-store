import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: "app-logout",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./logout.component.html",
  styleUrls: ["./logout.component.css"],
})
export class LogoutComponent implements OnInit, OnDestroy {
  countdown = 5;
  private countdownInterval: any;

  constructor(private router: Router) {}

  /**
   * ngOnInit
   *
   * Initialize component and start countdown timer
   *
   * @return void
   */
  ngOnInit(): void {
    this.startCountdown();
  }

  /**
   * ngOnDestroy
   *
   * Cleanup countdown interval when component is destroyed
   *
   * @return void
   */
  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * startCountdown
   *
   * Starts countdown timer and redirects to home after 5 seconds
   *
   * @return void
   */
  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;

      // Navigate to home when countdown reaches zero
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.navigateToHome();
      }
    }, 1000);
  }

  /**
   * navigateToHome
   *
   * Redirects user to home page
   *
   * @return void
   */
  navigateToHome(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(["/"]);
  }
}