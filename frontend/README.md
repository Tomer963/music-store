# Music Store Frontend

Modern, responsive online music store built with Angular 19. Single Page Application (SPA) providing seamless shopping experience for music albums.

## Features

- Browse music albums by category
- Real-time search functionality
- Shopping cart management
- Wishlist functionality
- User authentication
- Secure checkout process
- Fully responsive design
- Infinite scroll pagination
- Optimized performance with lazy loading

## Technologies

- Angular 19
- RxJS
- HTML5/CSS3
- RESTful API integration

## Prerequisites

- Node.js >= 16.x
- npm >= 8.x
- Angular CLI >= 19.x

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd music-store-frontend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment:

```bash
cp .env.example .env
```

4. Update API URL in `src/environments/environment.ts`

## Development

Run development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`

## Build

Build for production:

```bash
npm run build
```

Build artifacts will be in `dist/` directory.

## Project Structure

```
src/
├── app/
│   ├── components/     # UI components
│   ├── pages/         # Page components
│   ├── services/      # Business logic services
│   ├── models/        # TypeScript interfaces
│   ├── guards/        # Route guards
│   ├── interceptors/  # HTTP interceptors
│   ├── pipes/         # Custom pipes
│   └── directives/    # Custom directives
├── assets/            # Static assets
├── environments/      # Environment configurations
└── styles.css        # Global styles
```

## Key Features

### Authentication

- JWT-based authentication
- Automatic token refresh
- Protected routes

### Shopping Cart

- Session-based cart for guests
- Persistent cart for authenticated users
- Real-time updates

### Search

- Debounced search input
- Autocomplete suggestions
- Results highlighting

### Performance

- Lazy loading for images
- Component lazy loading
- HTTP request caching
- CSS sprites

## API Integration

Backend REST API endpoints:

- `/api/v1/albums` - Album management
- `/api/v1/categories` - Category browsing
- `/api/v1/auth` - Authentication
- `/api/v1/cart` - Shopping cart
- `/api/v1/orders` - Order processing
- `/api/v1/wishlist` - Wishlist management

## Testing

Run unit tests:

```bash
npm test
```

Run e2e tests:

```bash
npm run e2e
```

## Deployment

1. Build for production:

```bash
npm run build
```

2. Deploy `dist/music-store-frontend` contents to web server

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

ISC

## Author

Tomer Dore
