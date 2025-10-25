import User from "../models/User.js";
import Album from "../models/Album.js";
import { formatResponse } from "../utils/helpers.js";
import { asyncHandler, assertFound } from "../middleware/errorHandler.js";

/**
 * getWishlist
 *
 * Retrieves the user's wishlist with populated album details
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
 * Adds an album to the user's wishlist
 */
export const addToWishlist = asyncHandler(async (req, res) => {
  const { albumId } = req.params;

  // Verify album exists
  const album = await Album.findById(albumId);
  assertFound(album, "Album");

  const wishlist = await req.user.addToWishlist(albumId);

  res.json(formatResponse(true, "Album added to wishlist", { wishlist }));
});

/**
 * removeFromWishlist
 *
 * Removes an album from the user's wishlist
 */
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { albumId } = req.params;

  const wishlist = await req.user.removeFromWishlist(albumId);

  res.json(formatResponse(true, "Album removed from wishlist", { wishlist }));
});