const Author = require('../models/Author');
const Book = require('../models/Book');
const handleError = require('../utils/errorHandler');

exports.createAuthor = async (req, res) => {
  try {
    const { name, country, bio } = req.body;
    const author = await Author.create({ name, country, bio });
    res.status(201).json(author);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ name: 1 });
    res.json(authors);
  } catch (err) {
    handleError(res, err);
  }
};

exports.getAuthorById = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }
    res.json(author);
  } catch (err) {
    handleError(res, err);
  }
};

exports.updateAuthor = async (req, res) => {
  try {
    const { name, country, bio } = req.body;
    const author = await Author.findByIdAndUpdate(
      req.params.id,
      { name, country, bio },
      { new: true, runValidators: true }
    );
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }
    res.json(author);
  } catch (err) {
    handleError(res, err);
  }
};

// Rule 4: cascade delete. Removing an author also removes their books
exports.deleteAuthor = async (req, res) => {
  try {
    const author = await Author.findById(req.params.id);
    if (!author) {
      return res.status(404).json({ message: `No author found with id ${req.params.id}` });
    }

    const { deletedCount } = await Book.deleteMany({ author: author._id });
    await author.deleteOne();

    res.json({
      message: `Author "${author.name}" and ${deletedCount} book(s) deleted`,
      author,
      deletedBooks: deletedCount,
    });
  } catch (err) {
    handleError(res, err);
  }
};