import User from "../models/User.js";
import Album from "../models/Album.js";
import { formatResponse } from "../utils/helpers.js";
import { asyncHandler, assertFound } from "../middleware/errorHandler.js";

/**
 * getWishlist
 *
 * Retrieve user's wishlist with populated album details
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "wishlist",
    populate: { path: "category", select: "name" },
  });

  res.json(formatResponse(true, "Wishlist retrieved", user.wishlist));
});

/**
 * addToWishlist
 *
 * Add album to user's wishlist
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const addToWishlist = asyncHandler(async (req, res) => {
  const { albumId } = req.params;

  // Verify album exists before adding to wishlist
  const album = await Album.findById(albumId);
  assertFound(album, "Album");

  // Add album to user's wishlist (model method handles duplicates)
  const wishlist = await req.user.addToWishlist(albumId);

  res.json(formatResponse(true, "Album added to wishlist", { wishlist }));
});

/**
 * removeFromWishlist
 *
 * Remove album from user's wishlist
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { albumId } = req.params;

  // Remove album from wishlist
  const wishlist = await req.user.removeFromWishlist(albumId);

  res.json(formatResponse(true, "Album removed from wishlist", { wishlist }));
});
