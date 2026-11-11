const mongoose = require('mongoose');
const Book = require('../models/Book');
const Author = require('../models/Author');
const handleError = require('../utils/errorHandler');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTABLE_FIELDS = ['price', 'title', 'publishedYear'];

// Returns { status, message } if a business rule is broken, otherwise null
const checkBookRules = async ({ title, price, publishedYear, author }, currentBookId = null) => {
  // Rule 3
  if (price !== undefined) {
    const p = Number(price);
    if (Number.isNaN(p) || p <= 0) {
      return { status: 422, message: 'Price must be a number greater than 0' };
    }
  }

  if (publishedYear !== undefined) {
    const year = Number(publishedYear);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1450 || year > currentYear) {
      return {
        status: 422,
        message: `Published year must be a whole number between 1450 and ${currentYear}`,
      };
    }
  }

  // Rule 1
  if (!author) {
    return { status: 400, message: 'Author id is required' };
  }
  if (!mongoose.isValidObjectId(author) || !(await Author.exists({ _id: author }))) {
    return { status: 400, message: `Cannot save book: no author exists with id ${author}` };
  }

  // Rule 2
  if (title) {
    const duplicate = await Book.findOne({
      author,
      title: title.trim(),
      _id: { $ne: currentBookId },
    }).collation({ locale: 'en', strength: 2 });

    if (duplicate) {
      return { status: 409, message: `This author already has a book titled "${duplicate.title}"` };
    }
  }

  return null;
};

exports.createBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body;
    const data = { title, genre, price, publishedYear, author };

    const ruleError = await checkBookRules(data);
    if (ruleError) {
      return res.status(ruleError.status).json({ message: ruleError.message });
    }

    const book = await Book.create(data);
    await book.populate('author');
    res.status(201).json(book);
  } catch (err) {
    handleError(res, err);
  }
};

// Rule 5: filters are added only when their query param is present
exports.getBooks = async (req, res) => {
  try {
    const { genre, minPrice, maxPrice, author, search, sort, order, page, limit } = req.query;
    const filter = {};

    if (genre) {
      filter.genre = genre;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined) {
        if (Number.isNaN(Number(minPrice))) {
          return res.status(400).json({ message: 'minPrice must be a number' });
        }
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined) {
        if (Number.isNaN(Number(maxPrice))) {
          return res.status(400).json({ message: 'maxPrice must be a number' });
        }
        filter.price.$lte = Number(maxPrice);
      }
      if (filter.price.$gte > filter.price.$lte) {
        return res.status(400).json({ message: 'minPrice cannot be greater than maxPrice' });
      }
    }

    if (author) {
      if (!mongoose.isValidObjectId(author)) {
        return res.status(400).json({ message: `Invalid author id: ${author}` });
      }
      filter.author = author;
    }

    if (search) {
      filter.title = { $regex: escapeRegex(search), $options: 'i' };
    }

    let sortOption = {};
    if (sort) {
      if (!SORTABLE_FIELDS.includes(sort)) {
        return res
          .status(400)
          .json({ message: `sort must be one of: ${SORTABLE_FIELDS.join(', ')}` });
      }
      if (order && !['asc', 'desc'].includes(order)) {
        return res.status(400).json({ message: 'order must be asc or desc' });
      }
      sortOption = { [sort]: order === 'desc' ? -1 : 1 };
    }

    // Pagination (challenge)
    const pageNum = page === undefined ? 1 : Number(page);
    const limitNum = limit === undefined ? 10 : Number(limit);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return res.status(400).json({ message: 'page must be a whole number of 1 or more' });
    }
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ message: 'limit must be a whole number between 1 and 100' });
    }

    const [total, results] = await Promise.all([
      Book.countDocuments(filter).collation({ locale: 'en', strength: 2 }),
      Book.find(filter)
        .collation({ locale: 'en', strength: 2 })
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('author'),
    ]);

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      results,
    });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('author');
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }
    res.json(book);
  } catch (err) {
    handleError(res, err);
  }
};

exports.updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }

    const { title, genre, price, publishedYear, author } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ title, genre, price, publishedYear, author }).filter(([, v]) => v !== undefined)
    );

    // Validate against the book as it would look after the update
    const merged = { ...book.toObject(), ...updates };
    const ruleError = await checkBookRules(merged, book._id);
    if (ruleError) {
      return res.status(ruleError.status).json({ message: ruleError.message });
    }

    Object.assign(book, updates);
    await book.save();
    await book.populate('author');
    res.json(book);
  } catch (err) {
    handleError(res, err);
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }
    res.json({ message: 'Book deleted', book });
  } catch (err) {
    handleError(res, err);
  }
};

exports.getBooksByAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }
    const books = await Book.find({ author: author._id });
    res.json({ author: author.name, count: books.length, books });
  } catch (err) {
    handleError(res, err);
  }
};