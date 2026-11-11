const express = require('express');
const {
  createAuthor,
  getAuthors,
  getAuthorById,
  updateAuthor,
  deleteAuthor,
} = require('../controllers/authorController');

const router = express.Router();

router.route('/').get(getAuthors).post(createAuthor);
router.route('/:id').get(getAuthorById).put(updateAuthor).delete(deleteAuthor);

module.exports = router;