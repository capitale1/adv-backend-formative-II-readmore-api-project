// Turns errors into consistent JSON responses
const handleError = (res, err) => {
  // Mongoose schema validation failed (e.g. missing required field)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  // Malformed id (e.g. /authors/abc)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }

  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server' });
};

module.exports = handleError;