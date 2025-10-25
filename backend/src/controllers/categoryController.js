import Category from "../models/Category.js";
import Album from "../models/Album.js";
import { MESSAGES } from "../config/constants.js";
import { formatResponse } from "../utils/helpers.js";
import { 
  asyncHandler, 
  NotFoundError, 
  BadRequestError,
  assertFound 
} from "../middleware/errorHandler.js";

/**
 * getCategories
 *
 * Retrieves all categories with album count
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find()
    .sort("name")
    .populate("albumCount");

  res.json(formatResponse(true, "Categories retrieved", categories));
});

/**
 * getCategory
 *
 * Retrieves a single category by ID
 */
export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  assertFound(category, "Category");

  res.json(formatResponse(true, "Category retrieved", category));
});

/**
 * getAlbumsByCategory
 *
 * Retrieves all albums in a specific category
 */
export const getAlbumsByCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  assertFound(category, "Category");

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
 * Creates a new category (Admin only)
 */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);

  res.status(201).json(
    formatResponse(true, MESSAGES.SUCCESS.CREATED, category)
  );
});

/**
 * updateCategory
 *
 * Updates an existing category (Admin only)
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  assertFound(category, "Category");

  res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, category));
});

/**
 * deleteCategory
 *
 * Deletes a category if it has no albums (Admin only)
 */
export const deleteCategory = asyncHandler(async (req, res) => {
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