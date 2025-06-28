# Music Store Frontend

A modern, responsive online music store built with Angular 19. This Single Page Application (SPA) provides a seamless shopping experience for music albums.

## Features

- 🎵 Browse music albums by category
- 🔍 Real-time search functionality
- 🛒 Shopping cart management
- ❤️ Wishlist functionality
- 👤 User authentication (login/register)
- 💳 Secure checkout process
- 📱 Fully responsive design
- 🔄 Infinite scroll pagination
- ⚡ Optimized performance with lazy loading

## Technologies

- Angular 19
- RxJS
- HTML5
- CSS3 (with CSS animations and transitions)
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

3. Copy environment file:

```bash
cp .env.example .env
```

4. Update the API URL in `src/environments/environment.ts` to match your backend server.

## Development

Run the development server:

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Build the project for production:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Project Structure

```
src/
├── app/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── services/      # API and business logic services
│   ├── models/        # TypeScript interfaces
│   ├── guards/        # Route guards
│   ├── interceptors/  # HTTP interceptors
│   ├── pipes/         # Custom pipes
│   └── directives/    # Custom directives
├── assets/            # Static assets
├── environments/      # Environment configurations
└── styles.css        # Global styles
```

## Key Features Implementation

### Authentication

- JWT-based authentication
- Automatic token refresh
- Protected routes with guards

### Shopping Cart

- Session-based cart for anonymous users
- Persistent cart for authenticated users
- Real-time cart updates

### Search

- Debounced search input
- Autocomplete suggestions
- Search results highlighting

### Performance Optimizations

- Lazy loading for images
- Component lazy loading
- HTTP request caching
- CSS sprites for icons

## API Integration

The frontend integrates with the backend REST API endpoints:

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

2. Deploy the contents of `dist/music-store-frontend` to your web server.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

ISC

## Author

Tomer Dore
