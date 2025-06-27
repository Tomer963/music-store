/**
 * Wishlist controller
 * Handles user wishlist operations
 */

import User from "../models/User.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * Get user wishlist
 * @route GET /api/v1/wishlist
 */
export const getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "wishlist",
      populate: { path: "category", select: "name" },
    });

    res.json(formatResponse(true, "Wishlist retrieved", user.wishlist));
  } catch (error) {
    next(error);
  }
};

/**
 * Add album to wishlist
 * @route POST /api/v1/wishlist/:albumId
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { albumId } = req.params;

    // Check if album exists
    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json(formatResponse(false, "Album not found"));
    }

    // Add to wishlist
    const wishlist = await req.user.addToWishlist(albumId);

    res.json(formatResponse(true, "Album added to wishlist", { wishlist }));
  } catch (error) {
    next(error);
  }
};

/**
 * Remove album from wishlist
 * @route DELETE /api/v1/wishlist/:albumId
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { albumId } = req.params;

    // Remove from wishlist
    const wishlist = await req.user.removeFromWishlist(albumId);

    res.json(formatResponse(true, "Album removed from wishlist", { wishlist }));
  } catch (error) {
    next(error);
  }
};
