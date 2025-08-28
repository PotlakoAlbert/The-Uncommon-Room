# Replit.md

## Overview

The Uncommon Room is a custom furniture platform built for a South African bespoke furniture business. The application is a full-stack web platform that enables customers to browse, customize, and order handcrafted furniture while providing administrators with comprehensive management tools for products, orders, and customer interactions. The platform specializes in custom furniture categories including headboards, tables, seating, and storage solutions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses **React 18** with **TypeScript** for type safety and better development experience. The application follows a **mobile-first design** approach using **Tailwind CSS** for styling and **shadcn/ui** components for consistent UI elements. State management is handled through **Redux Toolkit** for global state (cart, authentication) and **React Query** for server state management and caching. The routing is implemented using **Wouter** for lightweight client-side navigation.

### Backend Architecture
The backend is built with **Express.js** and follows RESTful API principles. It uses **TypeScript** throughout for consistency and type safety. Database operations are handled through **Drizzle ORM** with **PostgreSQL** as the primary database. The API includes comprehensive authentication using **JWT tokens** and **bcrypt** for password hashing. File uploads are managed through **Multer** with **Cloudinary** integration for image storage.

### Database Design
The database uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations. Key entities include:
- **Customers**: User accounts with authentication and profile information
- **Products**: Furniture items with categories, pricing, and image galleries
- **Orders**: Purchase records with status tracking and payment information
- **Shopping Carts**: Persistent cart storage with custom notes support
- **Inquiries**: Customer contact and support requests
- **Custom Design Requests**: Bespoke furniture specifications and requirements
- **Admin**: Administrative user accounts with elevated permissions

### Authentication & Authorization
The system implements **JWT-based authentication** with separate user types (customers and admins). Passwords are securely hashed using **bcrypt**. The frontend stores authentication tokens in localStorage and includes them in API requests. Protected routes are implemented on both frontend and backend levels.

### File Management
Product images and custom design reference photos are stored using **Cloudinary** for reliable cloud storage and image optimization. The system supports multiple image formats with size restrictions and automatic compression.

### API Structure
The REST API follows conventional HTTP methods and status codes. Key endpoints include:
- `/api/auth/*` - Authentication and user management
- `/api/products/*` - Product catalog operations
- `/api/orders/*` - Order management and tracking
- `/api/cart/*` - Shopping cart operations
- `/api/inquiries/*` - Customer inquiries and support
- `/api/admin/*` - Administrative functions

## External Dependencies

### Database
- **PostgreSQL** via **Neon Database** (serverless PostgreSQL)
- **Drizzle ORM** for database schema management and queries
- **Drizzle Kit** for migrations and schema synchronization

### Cloud Services
- **Cloudinary** for image storage, optimization, and delivery
- **Nodemailer** for email notifications (order confirmations, updates)

### Development Tools
- **Vite** for frontend build tooling and development server
- **TypeScript** for static type checking across the entire stack
- **ESBuild** for fast backend bundling in production

### UI Components
- **Radix UI** primitives for accessible component foundations
- **shadcn/ui** component library for consistent design system
- **Tailwind CSS** for utility-first styling
- **Material Icons** for iconography

### State Management
- **Redux Toolkit** for global application state
- **React Query** for server state management and caching
- **React Hook Form** with **Zod** for form validation

### Security & Performance
- **Helmet** for security headers
- **CORS** for cross-origin request handling
- **Express Rate Limit** for API rate limiting
- **JWT** for stateless authentication