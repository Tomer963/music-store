/**
 * Album controller
 * Handles all album-related operations
 */

import Album from "../models/Album.js";
import { MESSAGES, PAGINATION } from "../config/constants.js";
import { paginate, formatResponse } from "../utils/helpers.js";

/**
 * Get all albums with pagination
 * @route GET /api/v1/albums
 */
export const getAlbums = async (req, res, next) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      sort = "-createdAt",
    } = req.query;

    const query = Album.find().populate("category", "name").sort(sort);

    const result = await paginate(query, page, limit);

    res.json(formatResponse(true, "Albums retrieved successfully", result));
  } catch (error) {
    next(error);
  }
};

/**
 * Get single album by ID
 * @route GET /api/v1/albums/:id
 */
export const getAlbum = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate(
      "category",
      "name"
    );

    if (!album) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, "Album retrieved successfully", album));
  } catch (error) {
    next(error);
  }
};

/**
 * Search albums
 * @route GET /api/v1/albums/search
 */
export const searchAlbums = async (req, res, next) => {
  try {
    const { q } = req.query;

    const albums = await Album.find({
      $text: { $search: q },
    })
      .populate("category", "name")
      .limit(10);

    res.json(formatResponse(true, "Search results", albums));
  } catch (error) {
    next(error);
  }
};

/**
 * Get new albums
 * @route GET /api/v1/albums/new
 */
export const getNewAlbums = async (req, res, next) => {
  try {
    const albums = await Album.find()
      .populate("category", "name")
      .sort("-createdAt")
      .limit(23);

    res.json(formatResponse(true, "New albums retrieved", albums));
  } catch (error) {
    next(error);
  }
};

/**
 * Create new album (Admin only)
 * @route POST /api/v1/albums
 */
export const createAlbum = async (req, res, next) => {
  try {
    const album = await Album.create(req.body);
    await album.populate("category", "name");

    res.status(201).json(formatResponse(true, MESSAGES.SUCCESS.CREATED, album));
  } catch (error) {
    next(error);
  }
};

/**
 * Update album (Admin only)
 * @route PUT /api/v1/albums/:id
 */
export const updateAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("category", "name");

    if (!album) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, MESSAGES.SUCCESS.UPDATED, album));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete album (Admin only)
 * @route DELETE /api/v1/albums/:id
 */
export const deleteAlbum = async (req, res, next) => {
  try {
    const album = await Album.findByIdAndDelete(req.params.id);

    if (!album) {
      return res
        .status(404)
        .json(formatResponse(false, MESSAGES.ERROR.NOT_FOUND));
    }

    res.json(formatResponse(true, MESSAGES.SUCCESS.DELETED));
  } catch (error) {
    next(error);
  }
};
