const Book = require('../models/Book');
const Author = require('../models/Author');
const handleError = require('../utils/errorHandler');

// POST /books
exports.createBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body;
    const book = await Book.create({ title, genre, price, publishedYear, author });
    const populated = await book.populate('author');
    res.status(201).json(populated);
  } catch (err) {
    handleError(res, err);
  }
};

// GET /books
exports.getBooks = async (req, res) => {
  try {
    const books = await Book.find().populate('author');
    res.json(books);
  } catch (err) {
    handleError(res, err);
  }
};

// GET /books/:id
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

// PUT /books/:id
exports.updateBook = async (req, res) => {
  try {
    const { title, genre, price, publishedYear, author } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, genre, price, publishedYear, author },
      { new: true, runValidators: true }
    ).populate('author');
    if (!book) {
      return res.status(404).json({ message: `No book found with id ${req.params.id}` });
    }
    res.json(book);
  } catch (err) {
    handleError(res, err);
  }
};

// DELETE /books/:id
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

// GET /authors/:id/books
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