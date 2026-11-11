# ReadMore API

A REST API for a bookstore, built with Express.js, MongoDB and Mongoose. It manages **authors** and **books** (one author has many books) and enforces business rules the database can't enforce on its own.

> The original assignment brief is in [ASSIGNMENT.md](ASSIGNMENT.md).

## Video walkthrough

[Watch the walkthrough](PASTE_VIDEO_LINK_HERE)

## Tech stack

- Node.js + Express.js
- MongoDB Atlas + Mongoose
- dotenv, nodemon

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root (see `.env.example`):
   ```
   MONGO_URI=your-mongodb-connection-string
   PORT=3000
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   The API runs at http://localhost:3000

## Project structure

```
├── server.js              # connects to MongoDB, then starts the server
├── models/
│   ├── Author.js
│   └── Book.js            # author field references the Author model
├── controllers/
│   ├── authorController.js
│   └── bookController.js
├── routes/
│   ├── authorRoutes.js
│   └── bookRoutes.js
└── utils/
    └── errorHandler.js    # shared error responses
```

Routes only map URLs to controller functions; all logic and business rules live in the controllers.

## Endpoints

### Authors

| Method | Path | Description |
|---|---|---|
| POST | `/authors` | Create an author |
| GET | `/authors` | Get all authors |
| GET | `/authors/:id` | Get one author |
| PUT | `/authors/:id` | Update an author |
| DELETE | `/authors/:id` | Delete an author **and their books** |
| GET | `/authors/:id/books` | Get all books by an author |
| GET | `/authors/:id/stats` | Get statistics for an author's books |

### Books

| Method | Path | Description |
|---|---|---|
| POST | `/books` | Create a book for an existing author |
| GET | `/books` | Get books, with filtering, sorting and pagination |
| GET | `/books/:id` | Get one book |
| PUT | `/books/:id` | Update a book |
| DELETE | `/books/:id` | Delete a book |

Book reads populate the `author` field with the author's full details.

## Business rules

| # | Rule | Response |
|---|---|---|
| 1 | A book's author id must belong to an existing author | `400` |
| 2 | An author can't have two books with the same title (case-insensitive) | `409` |
| 3 | Price must be greater than 0; published year must be between 1450 and the current year | `422` |
| 4 | Deleting an author also deletes their books (cascade) | `200` |
| 5 | `GET /books` supports any combination of filters | `200` / `400` for invalid params |
| 6 | `GET /authors/:id/stats` returns a summary, including when there are no books | `200` |

Ids that are well-formed but don't exist return `404`; malformed ids return `400`.

### Rule 4: author-delete policy (cascade)

I chose to **cascade**: deleting an author also deletes all of their books.

**Why:** in this API a book can't exist without a valid author (Rule 1), so once the author is gone their books have no valid owner. Cascading keeps the database consistent in one step, with no orphans and no placeholder "Unknown Author".

**Downside:** it's destructive and permanent. Deleting the wrong author, or an author whose books are tied to past sales, loses that data. A production store might instead block the delete (409) or use a soft delete (archiving records instead of removing them). Wrapping both deletes in a transaction would also guarantee they succeed or fail together.

### Rule 5: filtering, sorting and pagination

The query is built dynamically: only parameters that are present are added to the filter.

```
GET /books?genre=Thriller&minPrice=10&maxPrice=30&search=sea&sort=price&order=asc&page=1&limit=10
```

| Param | Effect |
|---|---|
| `genre` | Exact genre (case-insensitive) |
| `minPrice` / `maxPrice` | Price range; either, both or neither |
| `author` | Books by that author id |
| `search` | Title contains the text (case-insensitive) |
| `sort` + `order` | Sort by `price`, `title` or `publishedYear`, `asc` or `desc` |
| `page` + `limit` | Pagination (defaults: page 1, limit 10, max 100) |

Response shape:

```json
{ "page": 1, "limit": 10, "total": 4, "totalPages": 1, "results": [ ... ] }
```

### Rule 6: author statistics

```json
{
  "author": "Chinua Achebe",
  "bookCount": 4,
  "averagePrice": 21.5,
  "cheapestBook": "Things Fall Apart",
  "mostExpensiveBook": "Anthills of the Savannah"
}
```

If the author has no books, `bookCount` is `0` and the other values are `null`. An average of `0` would wrongly suggest the books are free, so `null` is used to mean "no value".

## Author

Armstrong NGORORANO