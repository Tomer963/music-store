import Album from "../models/Album.js";
import { MESSAGES, PAGINATION } from "../config/constants.js";
import { paginate, formatResponse } from "../utils/helpers.js";
import { asyncHandler, AppError } from "../middleware/errorHandler.js";

/**
 * getAlbums
 *
 * Retrieves all albums with pagination and optional category filter
 */
export const getAlbums = asyncHandler(async (req, res) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    sort = "-createdAt",
    category = null,
  } = req.query;

  const queryFilter = category ? { category } : {};
  const query = Album.find(queryFilter)
    .populate("category", "name")
    .sort(sort);

  const result = await paginate(query, page, limit);

  res.json(formatResponse(true, "Albums retrieved successfully", result));
});

/**
 * getAlbum
 *
 * Retrieves a single album by ID with populated category
 */
export const getAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findById(req.params.id).populate("category", "name");

  if (!album) {
    throw new AppError(MESSAGES.ERROR.NOT_FOUND, 404);
  }

  res.json(formatResponse(true, "Album retrieved successfully", album));
});

/**
 * searchAlbums
 *
 * Searches albums by title, artist or description using regex matching
 */
export const searchAlbums = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 3) {
    return res.json(formatResponse(true, "Search results", []));
  }

  const searchQuery = q.trim();
  const searchRegex = new RegExp(searchQuery, "i");

  const albums = await Album.find({
    $or: [
      { title: searchRegex },
      { artist: searchRegex },
      { description: searchRegex },
    ],
  })
    .populate("category", "name")
    .limit(10);

  res.json(formatResponse(true, "Search results", albums));
});

/**
 * getNewAlbums
 *
 * Retrieves newest albums sorted by creation date
 */
export const getNewAlbums = asyncHandler(async (req, res) => {
  const { page = 1, limit = 23 } = req.query;

  const query = Album.find().populate("category", "name").sort("-createdAt");
  const result = await paginate(query, page, limit);

  res.json(formatResponse(true, "New albums retrieved", result));
});

/**
 * createAlbum
 *
 * Creates a new album (Admin only)
 */
export const createAlbum = asyncHandler(async (req, res) => {
  const album = await Album.create(req.body);
  await album.populate("category", "name");

  res.status(201).json(formatResponse(true, MESSAGES.SUCCESS.CREATED, album));
});

/**
 * updateAlbum
 *
 * Updates an existing album (Admin only)
 */
export const updateAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("category", "name");

  if (!album) {
    throw new AppError(MESSAGES.ERROR.NOT_FOUND, 404);
  }

  res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, album));
});

/**
 * deleteAlbum
 *
 * Deletes an album (Admin only)
 */
export const deleteAlbum = asyncHandler(async (req, res) => {
  const album = await Album.findByIdAndDelete(req.params.id);

  if (!album) {
    throw new AppError(MESSAGES.ERROR.NOT_FOUND, 404);
  }

  res.json(formatResponse(true, MESSAGES.SUCCESS.DELETED));
});