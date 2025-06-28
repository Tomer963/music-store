/**
 * Album Card Component
 * Displays album information in a card format with hover effects
 */

import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { Album } from "../../../models/album.model";
import { CartService } from "../../../services/cart.service";
import { AlbumService } from "../../../services/album.service";

@Component({
  selector: "app-album-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./album-card.component.html",
  styleUrls: ["./album-card.component.css"],
})
export class AlbumCardComponent implements OnInit {
  @Input() album!: Album;
  @Input() size: "small" | "medium" | "large" = "medium";
  @Input() showHover = false;
  @Input() showInfo = false;
  @Input() showPrice = false;

  isHovered = false;
  isAddingToCart = false;
  mainImageUrl = "";

  constructor(
    private router: Router,
    private cartService: CartService,
    private albumService: AlbumService
  ) {}

  ngOnInit(): void {
    this.mainImageUrl = this.albumService.getMainImageUrl(this.album);
  }

  /**
   * Navigate to album detail page
   */
  viewAlbum(): void {
    this.router.navigate(["/album", this.album._id]);
  }

  /**
   * Add album to cart
   * @param event Mouse event
   */
  addToCart(event: Event): void {
    event.stopPropagation();

    if (this.isAddingToCart || !this.album.inStock) {
      return;
    }

    this.isAddingToCart = true;

    this.cartService.addToCart(this.album._id).subscribe({
      next: () => {
        this.isAddingToCart = false;
        // Show success feedback (could use a toast service)
        this.showAddedFeedback();
      },
      error: (error) => {
        console.error("Failed to add to cart:", error);
        this.isAddingToCart = false;
      },
    });
  }

  /**
   * Show visual feedback when item is added to cart
   */
  private showAddedFeedback(): void {
    // Simple visual feedback - could be enhanced with animations
    const originalText = this.isHovered;
    this.isHovered = false;

    setTimeout(() => {
      if (originalText) {
        this.isHovered = true;
      }
    }, 1000);
  }

  /**
   * Get formatted price
   * @returns Formatted price string
   */
  getFormattedPrice(): string {
    return this.albumService.formatPrice(this.album.price);
  }

  /**
   * Get truncated description
   * @returns Truncated description
   */
  getTruncatedDescription(): string {
    const maxLength = 100;
    if (this.album.description.length <= maxLength) {
      return this.album.description;
    }
    return this.album.description.substring(0, maxLength) + "...";
  }
}
