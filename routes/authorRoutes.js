const express = require('express');
const {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
} = require('../controllers/authorController');
const { 
    getBooksByAuthor 
} = require('../controllers/bookController');

const router = express.Router();

router.route('/').get(getAuthors).post(createAuthor);
router.route('/:id').get(getAuthorById).put(updateAuthor).delete(deleteAuthor);
router.get('/:id/books', getBooksByAuthor);

module.exports = router;