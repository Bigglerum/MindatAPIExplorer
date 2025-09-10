# Overview

This is a comprehensive Mindat API Explorer application that serves as a gateway to mineralogy data. The system provides multiple interfaces for accessing the Mindat API (a geological database) and the RRUFF database (a mineral spectroscopy database), offering both direct API exploration capabilities and a rich knowledge base for mineralogical research.

The application combines API documentation parsing, interactive exploration tools, saved request management, and extensive mineral data visualization. It includes support for crystal systems, Dana and Strunz classifications, space groups, and detailed mineral property searches.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## September 10, 2025 - Enterprise Security Implementation Complete
- **Production-Ready Security**: Implemented comprehensive enterprise-grade security system
- **Two-Tier Rate Limiting**: IP-based pre-auth (200 req/15min) + API key-based post-auth limits  
- **Complete Request Analytics**: All requests logged including 401/403/429 responses
- **Bearer Token Authentication**: Secure API key validation with permission enforcement
- **Admin Endpoint Protection**: Proper middleware ordering with admin permission checks
- **Cron Service Idempotency**: Prevents duplicate job scheduling on hot reloads
- **Postgres Array Optimization**: Efficient element queries with native @> and && operators

## Integration Notes
- **GitHub Integration**: User dismissed GitHub connector integration. For future GitHub operations, manual setup with personal access token will be required.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript running on Vite for fast development and building
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom CSS variables for theming support

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database interactions
- **API Proxy**: Custom proxy service to handle requests to external APIs (Mindat and RRUFF)
- **File Processing**: CSV parsing and bulk import capabilities for RRUFF data
- **Code Generation**: Dynamic code generation for multiple programming languages (Python, JavaScript, cURL)

## Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **Data Models**: 
  - Core API documentation tables (endpoints, categories, saved requests)
  - RRUFF mineral database tables (minerals, spectra, import logs)
  - User authentication and API key management

## Authentication and Authorization
- **API Authentication**: Token-based authentication for Mindat API access
- **Session Management**: PostgreSQL-based session storage with connect-pg-simple
- **API Key Validation**: Server-side validation of Mindat API credentials
- **User Management**: Basic user system for saving requests and managing preferences

## External Service Integrations
- **Mindat API**: Primary geological database API for mineral and locality data
- **RRUFF Database**: Spectroscopy and crystal structure data with CSV import capabilities
- **OpenAI Integration**: AI-powered chat functionality for mineralogy assistance
- **Swagger/OpenAPI**: Automatic API documentation parsing and endpoint discovery

The system architecture emphasizes modularity with clear separation between API proxy services, data import utilities, and user interface components. The application supports both real-time API exploration and offline mineral database functionality through the imported RRUFF data.

# External Dependencies

## Third-party APIs
- **Mindat API** (api.mindat.org): Core geological database providing mineral species, localities, and crystallographic data
- **RRUFF Database** (rruff.info): Mineral spectroscopy database with downloadable CSV exports for offline access
- **OpenAI API**: AI chat functionality for mineralogy assistance and query interpretation

## Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting with connection pooling
- **Database Connection**: @neondatabase/serverless for optimized serverless database connections

## Development and Build Tools
- **Vite**: Fast build tool and development server with React plugin support
- **TypeScript**: Type safety across frontend and backend code
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL support
- **ESBuild**: Fast JavaScript bundler for production builds

## Authentication and Security
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Basic/Token Authentication**: Support for both authentication methods with Mindat API
- **CORS Handling**: Cross-origin request support for API proxy functionality

## Data Processing Libraries
- **csv-parse**: High-performance CSV parsing for RRUFF data imports
- **cheerio**: Server-side HTML parsing for web scraping capabilities
- **node-fetch**: HTTP client for server-side API requests

## UI and Component Libraries
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework with custom theming
- **Lucide React**: Icon library for consistent iconography
- **TanStack Query**: Data fetching and caching library for optimal user experience

The application is designed to work with or without active internet connectivity to external APIs, falling back to cached RRUFF data when external services are unavailable.