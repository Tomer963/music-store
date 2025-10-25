import Category from "../models/Category.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";
import {
  asyncHandler,
  BadRequestError,
  assertFound,
} from "../middleware/errorHandler.js";

/**
 * getCategories
 *
 * Retrieve all categories with album count
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort("name").populate("albumCount");

  res.json(formatResponse(true, "Categories retrieved", categories));
});

/**
 * getCategory
 *
 * Retrieve single category by ID
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  assertFound(category, "Category");

  res.json(formatResponse(true, "Category retrieved", category));
});

/**
 * getAlbumsByCategory
 *
 * Retrieve all albums belonging to specific category
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const getAlbumsByCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  assertFound(category, "Category");

  // Get all albums in this category
  const albums = await Album.find({ category: req.params.id })
    .populate("category", "name")
    .sort("-createdAt");

  res.json(
    formatResponse(true, "Albums retrieved", {
      category: category.name,
      count: albums.length,
      albums,
    })
  );
});

/**
 * createCategory
 *
 * Create new category (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);

  res
    .status(201)
    .json(formatResponse(true, MESSAGES.SUCCESS.CREATED, category));
});

/**
 * updateCategory
 *
 * Update existing category (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  assertFound(category, "Category");

  res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, category));
});

/**
 * deleteCategory
 *
 * Delete category only if no albums are assigned to it (Admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Promise<void>}
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  // Check if category has any albums
  const albumCount = await Album.countDocuments({ category: req.params.id });

  if (albumCount > 0) {
    throw new BadRequestError(
      `Cannot delete category with ${albumCount} album(s). Please remove or reassign albums first.`
    );
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  assertFound(category, "Category");

  res.json(formatResponse(true, MESSAGES.SUCCESS.DELETED));
});
