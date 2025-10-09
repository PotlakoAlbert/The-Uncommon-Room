# The Uncommon Room - Furniture E-commerce Platform

A modern full-stack e-commerce application for custom furniture with React frontend and Express.js backend.

## Architecture

- **Frontend**: React + TypeScript + Vite (deployed on Vercel)
- **Backend**: Express.js + TypeScript (deployed on Railway)
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT
- **Styling**: Tailwind CSS + shadcn/ui

## Deployment Configuration

### Frontend (Vercel)
The frontend is deployed on Vercel with the following configuration:

**Build Settings:**
- Build Command: `cd client && npm install && npm run build`
- Output Directory: `client/dist`
- Install Command: `npm install`

**Environment Variables:**
- `VITE_API_URL`: `https://web-production-b8bea.up.railway.app`

### Backend (Railway)
The backend is deployed on Railway with the following configuration:

**Build Settings:**
- Build Command: `npm run build:server`
- Start Command: `npm start`

**Required Environment Variables:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
CORS_ORIGIN=https://the-uncommon-room-duyr.vercel.app
FRONTEND_URL=https://the-uncommon-room-duyr.vercel.app
PORT=8080
NODE_ENV=production
```

## Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/PotlakoAlbert/The-Uncommon-Room.git
   cd The-Uncommon-Room
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd client && npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Run development servers:**
   ```bash
   # Backend (from root directory)
   npm run dev

   # Frontend (in new terminal, from client directory)
   cd client
   npm run dev
   ```

## Deployment Instructions

### Deploy to Railway (Backend)
1. Connect your GitHub repository to Railway
2. Set the environment variables listed above
3. Railway will automatically detect the configuration and deploy

### Deploy to Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set the root directory to `client`
3. Configure the build settings as mentioned above
4. Set the `VITE_API_URL` environment variable
5. Deploy

## File Structure

```
├── client/                 # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vercel.json
├── server/                 # Express backend
│   ├── index.ts
│   ├── routes/
│   ├── middleware/
│   └── db.ts
├── api/                    # Built backend (auto-generated)
├── shared/                 # Shared types and schemas
├── build.mjs              # Build script
├── package.json           # Root package.json
├── Procfile              # Railway deployment
├── nixpacks.toml         # Railway build configuration
├── railway.json          # Railway deployment settings
└── vercel.json           # Vercel deployment settings
```

## Features

- 🛒 Shopping cart functionality
- 👤 User authentication and authorization
- 🛋️ Product catalog and management
- 📋 Order management
- 🎨 Custom design requests
- 📱 Responsive design
- 🔐 Admin panel
- 📧 Email notifications

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Query
- Redux Toolkit
- React Hook Form
- Wouter (routing)

### Backend
- Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL
- JWT Authentication
- bcrypt
- CORS
- Helmet (security)
- Multer (file uploads)
- Nodemailer