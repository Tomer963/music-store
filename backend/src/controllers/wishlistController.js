import User from "../models/User.js";
import Album from "../models/Album.js";
import { formatResponse } from "../utils/helpers.js";

/**
 * getWishlist
 *
 * Retrieves the user's wishlist with populated album details
 *
 * @param {Object} req - Express request object with authenticated user
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
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
 * addToWishlist
 *
 * Adds an album to the user's wishlist
 *
 * @param {Object} req - Express request object with albumId in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const addToWishlist = async (req, res, next) => {
  try {
    const { albumId } = req.params;

    // Verify album exists
    const album = await Album.findById(albumId);
    if (!album) {
      return res.status(404).json(formatResponse(false, "Album not found"));
    }

    const wishlist = await req.user.addToWishlist(albumId);
    res.json(formatResponse(true, "Album added to wishlist", { wishlist }));
  } catch (error) {
    next(error);
  }
};

/**
 * removeFromWishlist
 *
 * Removes an album from the user's wishlist
 *
 * @param {Object} req - Express request object with albumId in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @return {Promise<void>}
 */
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const wishlist = await req.user.removeFromWishlist(albumId);
    res.json(formatResponse(true, "Album removed from wishlist", { wishlist }));
  } catch (error) {
    next(error);
  }
};
