# Music Store Backend API

A RESTful API for an online music store built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization with JWT
- Album management with CRUD operations
- Category management
- Shopping cart functionality for authenticated and guest users
- Wishlist management
- Order processing with billing validation
- Search functionality
- Input validation and sanitization
- Comprehensive error handling
- Rate limiting based on environment
- Security headers with Helmet
- Database connection management with auto-reconnection
- Health check endpoints

## Technical Stack

- **Runtime**: Node.js (>=16.x)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, bcryptjs
- **Validation**: express-validator
- **Rate Limiting**: express-rate-limit

## Requirements

- Node.js >= 16.x
- MongoDB >= 5.x
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd music-store-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/music-store

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000

# API
API_VERSION=v1
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## API Endpoints

### Base URL

`http://localhost:3000/api/v1`

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile (requires auth)
- `POST /auth/logout` - Logout user (requires auth)

### Albums

- `GET /albums` - Get all albums (with pagination)
- `GET /albums/:id` - Get single album
- `GET /albums/new` - Get newest albums
- `GET /albums/search?q=query` - Search albums
- `POST /albums` - Create album (admin only)
- `PUT /albums/:id` - Update album (admin only)
- `DELETE /albums/:id` - Delete album (admin only)

### Categories

- `GET /categories` - Get all categories
- `GET /categories/:id` - Get single category
- `GET /categories/:id/albums` - Get albums by category
- `POST /categories` - Create category (admin only)
- `PUT /categories/:id` - Update category (admin only)
- `DELETE /categories/:id` - Delete category (admin only)

### Cart

- `GET /cart` - Get cart items
- `POST /cart/items` - Add item to cart
- `PUT /cart/items/:id` - Update cart item quantity
- `DELETE /cart/items/:id` - Remove item from cart
- `DELETE /cart` - Clear cart

### Orders

- `GET /orders` - Get user orders (requires auth)
- `GET /orders/:id` - Get single order (requires auth)
- `POST /orders` - Create order (requires auth)
- `GET /orders/admin/all` - Get all orders (admin only)
- `GET /orders/admin/statistics` - Get order statistics (admin only)
- `PUT /orders/:id` - Update order (admin only)
- `DELETE /orders/:id` - Delete order (admin only)

### Wishlist

- `GET /wishlist` - Get wishlist (requires auth)
- `POST /wishlist/:albumId` - Add to wishlist (requires auth)
- `DELETE /wishlist/:albumId` - Remove from wishlist (requires auth)

### Health Check

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with metrics

## Rate Limiting

- **Development**: 1000 requests per 15 minutes
- **Production**: 100 requests per 15 minutes

Rate limits are applied per IP address and exclude health check endpoints.

## Error Handling

The API uses standardized error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description",
  "errors": [] // Optional validation errors array
}
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Helmet security headers
- CORS configuration
- Request validation and sanitization
- Rate limiting
- MongoDB injection prevention
- XSS protection

## Database Models

### User

- firstName, lastName
- email (unique)
- password (hashed)
- role (admin/user)
- wishlist
- billingInfo

### Album

- title, artist
- category (reference)
- releaseYear, price
- stock, availability
- description, longDescription
- images array

### Category

- name (unique)

### Order

- user (reference)
- items array
- totalAmount
- paymentMethod
- billingInfo
- orderNumber (auto-generated)

### CartItem

- user (reference) or sessionId
- album (reference)
- quantity

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── constants.js
│   │   └── database.js
│   ├── controllers/
│   │   ├── albumController.js
│   │   ├── authController.js
│   │   ├── cartController.js
│   │   ├── categoryController.js
│   │   ├── orderController.js
│   │   └── wishlistController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── models/
│   │   ├── Album.js
│   │   ├── CartItem.js
│   │   ├── Category.js
│   │   ├── Order.js
│   │   └── User.js
│   ├── routes/
│   │   ├── albums.js
│   │   ├── auth.js
│   │   ├── cart.js
│   │   ├── categories.js
│   │   ├── orders.js
│   │   └── wishlist.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── validators.js
│   └── app.js
├── server.js
├── package.json
├── .gitignore
└── README.md
```

## License

ISC
