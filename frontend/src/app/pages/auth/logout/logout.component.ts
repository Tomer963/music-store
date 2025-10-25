import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";

@Component({
  selector: "app-logout",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./logout.component.html",
  styleUrls: ["./logout.component.css"],
})
export class LogoutComponent implements OnInit {
  countdown = 5;
  private countdownInterval: any;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Start countdown timer
    this.startCountdown();
  }

  ngOnDestroy(): void {
    // Clear interval when component is destroyed
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Start Countdown
   *
   * Starts countdown timer and redirects to home after 5 seconds
   *
   * @return void
   */
  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.navigateToHome();
      }
    }, 1000);
  }

  /**
   * Navigate To Home
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