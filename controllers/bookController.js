const mongoose = require('mongoose');
const Book = require('../models/Book');
const Author = require('../models/Author');
const handleError = require('../utils/errorHandler');

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

exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find().populate('author');
    res.json(books);
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