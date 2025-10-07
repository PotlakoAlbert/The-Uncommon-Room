import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { roleEnum } from "@shared/schema";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";

// Multer configuration for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import cartRoutes from "./routes/cart";
import adminRoutes from "./routes/admin";

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "your_smtp_user",
    pass: process.env.SMTP_PASS || "your_smtp_password",
  },
});

import { authenticateToken, requireAdmin, AuthRequest } from './middleware/auth';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// (Removed duplicate registerRoutes implementation)

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'The Uncommon Room API',
      version: '1.0.0',
      description: 'Custom Furniture Platform API',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
  },
  apis: ['./server/routes.ts'], // Path to the API docs
};

const specs = swaggerJsdoc(swaggerOptions);

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'https://uncommon-furniture.vercel.app',
      'https://the-uncommon-room.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cookieParser());
  // app.use(limiter); // Temporarily disabled for debugging

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/admins', adminRoutes);

  // Swagger documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

  /**
   * @swagger
   * components:
   *   schemas:
   *     User:
   *       type: object
   *       properties:
   *         id:
   *           type: integer
   *         name:
   *           type: string
   *         email:
   *           type: string
   *         role:
   *           type: string
   *           enum: [user, admin]
   *         phone:
   *           type: string
   *         address:
   *           type: string
   */

  // Authentication routes
  
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - email
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               phone:
   *                 type: string
   *               address:
   *                 type: string
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Registration failed
   */
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone, address } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const user = await storage.createUser({
        name,
        email,
        passwordHash: passwordHash,
        phone,
        address,
      });

      // Create shopping cart
      await storage.createCart(user.id);

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is not set");
      }
      const token = jwt.sign(
        { id: user.id, type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: { ...user, passwordHash: undefined },
        customer: { ...user, passwordHash: undefined },
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed';
      
      if (error.code === '22001') {
        errorMessage = 'One of the fields is too long. Please check your input.';
      } else if (error.code === '23505') {
        errorMessage = 'Email already registered';
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login customer
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find customer
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'No account found for this email. Please register.' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is not set");
      }
      const token = jwt.sign(
        { id: user.id, type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { ...user, passwordHash: undefined },
        customer: { ...user, passwordHash: undefined },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Admin authentication
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find admin
      const admin = await storage.getAdminByEmail(email);
      if (!admin) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if there's already a user record for this admin
      let userRecord = await storage.getUserByEmail(email);
      
      // If no user record exists, create one
      if (!userRecord) {
        const { name, email, passwordHash, phone, address } = admin;
        userRecord = await storage.createUser({
          name,
          email,
          passwordHash,
          role: 'admin',
          phone,
          address,
          adminId: admin.adminId
        });
      }

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET environment variable is not set");
      }

      const token = jwt.sign(
        { id: admin.adminId, email: admin.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        admin: { ...admin, passwordHash: undefined },
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Product routes
  
  /**
   * @swagger
   * /products:
   *   get:
   *     summary: Get all products with optional filtering
   *     tags: [Products]
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *         description: Filter by category
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *         description: Minimum price filter
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *         description: Maximum price filter
   *       - in: query
   *         name: material
   *         schema:
   *           type: string
   *         description: Filter by material
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search by name
   *     responses:
   *       200:
   *         description: List of products
   */
  app.get('/api/products', async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        material: req.query.material as string,
        search: req.query.search as string,
      };

      const products = await storage.getAllProducts(filters);
      res.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  /**
   * @swagger
   * /products/{id}:
   *   get:
   *     summary: Get product by ID
   *     tags: [Products]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Product ID
   *     responses:
   *       200:
   *         description: Product details
   *       404:
   *         description: Product not found
   */
  app.get('/api/products/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ message: 'Failed to fetch product' });
    }
  });

  // Shopping cart routes
  app.get('/api/cart', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      let cart = await storage.getCart(userId);
      
      if (!cart) {
        cart = await storage.createCart(userId);
      }

      const cartItems = await storage.getCartItems(cart.id);
      res.json({ cart, items: cartItems });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ message: 'Failed to fetch cart' });
    }
  });

  app.post('/api/cart/items', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { productId, quantity, customNotes } = req.body;

      let cart = await storage.getCart(userId);
      if (!cart) {
        cart = await storage.createCart(userId);
      }

      const cartItem = await storage.addToCart(cart.id, {
        productId,
        quantity: quantity || 1,
        customNotes,
      });

      res.status(201).json(cartItem);
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ message: 'Failed to add item to cart' });
    }
  });

  app.put('/api/cart/items/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity, customNotes } = req.body;

      const cartItem = await storage.updateCartItem(id, quantity, customNotes);
      res.json(cartItem);
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json({ message: 'Failed to update cart item' });
    }
  });

  app.delete('/api/cart/items/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.removeFromCart(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Cart item not found' });
      }

      res.json({ message: 'Item removed from cart' });
    } catch (error) {
      console.error('Remove from cart error:', error);
      res.status(500).json({ message: 'Failed to remove item from cart' });
    }
  });

  // Order routes
  app.post('/api/orders', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { totalAmount, shippingAddress, paymentMethod } = req.body;

      // Get cart items
      const cart = await storage.getCart(userId);
      if (!cart) {
        return res.status(400).json({ message: 'No cart found' });
      }

      const cartItems = await storage.getCartItems(cart.id);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // Create order
      const order = await storage.createOrder(
        {
          userId,
          totalAmount,
          shippingAddress,
          paymentMethod,
          status: 'pending',
          paymentStatus: 'pending',
        },
        cartItems.map(item => ({
          productId: item.productId!,
          quantity: item.quantity,
          unitPrice: item.product.price,
        }))
      );

      // Clear cart
      await storage.clearCart(cart.id);

      // Send confirmation email
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@theuncommonroom.co.za',
          to: (await storage.getUser(userId))?.email,
          subject: 'Order Confirmation - The Uncommon Room',
          html: `
            <h1>Thank you for your order!</h1>
            <p>Your order #UCR-${order.id} has been placed successfully.</p>
            <p>Total Amount: R ${totalAmount}</p>
            <p>We'll update you on the progress of your order.</p>
          `,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      res.status(201).json(order);
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ message: 'Failed to create order' });
    }
  });

  app.get('/api/orders', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.get('/api/orders/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Check if order belongs to user (unless admin)
      if (req.user!.role !== 'admin' && order.userId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const orderItems = await storage.getOrderItems(id);
      res.json({ ...order, items: orderItems });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ message: 'Failed to fetch order' });
    }
  });

  // Inquiry routes
  app.post('/api/inquiries', async (req, res) => {
    try {
      const inquiry = await storage.createInquiry(req.body);

      // Send notification email to admin
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@theuncommonroom.co.za',
          to: process.env.ADMIN_EMAIL || 'admin@theuncommonroom.co.za',
          subject: 'New Inquiry - The Uncommon Room',
          html: `
            <h1>New Inquiry Received</h1>
            <p><strong>Name:</strong> ${inquiry.name}</p>
            <p><strong>Email:</strong> ${inquiry.email}</p>
            <p><strong>Subject:</strong> ${inquiry.subject}</p>
            <p><strong>Message:</strong> ${inquiry.message}</p>
            <p><strong>Type:</strong> ${inquiry.inquiryType}</p>
          `,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      res.status(201).json(inquiry);
    } catch (error) {
      console.error('Create inquiry error:', error);
      res.status(500).json({ message: 'Failed to create inquiry' });
    }
  });

  // Custom design routes
  app.post('/api/custom-designs', upload.array('images', 5), authenticateToken, async (req: AuthRequest, res) => {
    try {
      const customerId = req.user!.id;
      const files = req.files as Express.Multer.File[];
      
      // Upload images to Cloudinary
      const imageUrls: string[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const result = await new Promise<any>((resolve, reject) => {
              cloudinary.uploader.upload_stream(
                { folder: 'custom-designs' },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              ).end(file.buffer);
            });
            imageUrls.push(result.secure_url);
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
          }
        }
      }

      // Parse optional referenceLinks (JSON array of URLs) from multipart form
      let referenceLinks: string[] = [];
      try {
        if (req.body.referenceLinks) {
          const parsed = JSON.parse(req.body.referenceLinks);
          if (Array.isArray(parsed)) {
            referenceLinks = parsed
              .map((u: any) => (typeof u === 'string' ? u.trim() : ''))
              .filter((u: string) => u.length > 0);
          }
        }
      } catch (e) {
        console.warn('Invalid referenceLinks JSON provided, ignoring');
      }

      const request = await storage.createCustomDesignRequest({
        userId: customerId,
        furnitureType: req.body.furnitureType,
        dimensions: req.body.dimensions,
        materialPreference: req.body.materialPreference,
        colorPreference: req.body.colorPreference,
        specialRequirements: req.body.specialRequirements,
  budgetRange: req.body.budgetRange,
  referenceImages: imageUrls,
  referenceLinks,
      });

      // Send notification email to admin
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@theuncommonroom.co.za',
          to: process.env.ADMIN_EMAIL || 'admin@theuncommonroom.co.za',
          subject: 'New Custom Design Request - The Uncommon Room',
          html: `
            <h1>New Custom Design Request</h1>
            <p><strong>Customer ID:</strong> ${customerId}</p>
            <p><strong>Furniture Type:</strong> ${req.body.furnitureType}</p>
            <p><strong>Budget Range:</strong> ${req.body.budgetRange}</p>
            <p><strong>Special Requirements:</strong> ${req.body.specialRequirements}</p>
          `,
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      res.status(201).json(request);
    } catch (error) {
      console.error('Create custom design error:', error);
      res.status(500).json({ message: 'Failed to create custom design request' });
    }
  });

  // Admin routes
  app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error('Get admin orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const order = await storage.updateOrderStatus(id, status);
      res.json(order);
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({ message: 'Failed to update order status' });
    }
  });

  app.get('/api/admin/customers', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const customers = await storage.getAllUsers();
      res.json(customers);
    } catch (error) {
      console.error('Get customers error:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.get('/api/admin/inquiries', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const inquiries = await storage.getAllInquiries();
      res.json(inquiries);
    } catch (error) {
      console.error('Get inquiries error:', error);
      res.status(500).json({ message: 'Failed to fetch inquiries' });
    }
  });

  app.get('/api/admin/custom-designs', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getAllCustomDesignRequests();
      res.json(requests);
    } catch (error) {
      console.error('Get custom designs error:', error);
      res.status(500).json({ message: 'Failed to fetch custom design requests' });
    }
  });

  app.put('/api/admin/custom-designs/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const idParam = req.params.id;
      // Check if id is valid before parsing
      if (!idParam || idParam === 'undefined' || idParam === 'null') {
        return res.status(400).json({ message: 'Valid design ID is required' });
      }
      
      const id = parseInt(idParam);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid design ID format' });
      }
      
      const { status, quoteAmount } = req.body as { status: string; quoteAmount?: string };
      if (!status) return res.status(400).json({ message: 'Status is required' });
      
      console.log('Updating custom design status:', { id, status, quoteAmount });
      const updated = await storage.updateCustomDesignStatus(id, status, quoteAmount);
      res.json(updated);
    } catch (error) {
      console.error('Update custom design status error:', error);
      res.status(500).json({ message: 'Failed to update custom design status' });
    }
  });

  // Admin products GET route
  app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        material: req.query.material as string,
        search: req.query.search as string,
      };

      // For admin, get all products (including inactive ones)
      const products = await storage.getAllProductsForAdmin(filters);
      res.json(products);
    } catch (error) {
      console.error('Get admin products error:', error);
      res.status(500).json({ message: 'Failed to fetch products' });
    }
  });

  app.post('/api/admin/products', upload.array('images', 10), authenticateToken, requireAdmin, async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      // Upload images to Cloudinary
      const imageUrls: string[] = [];
      let mainImage = '';
      
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const result = await new Promise<any>((resolve, reject) => {
              cloudinary.uploader.upload_stream(
                { folder: 'products' },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              ).end(file.buffer);
            });
            
            if (i === 0) {
              mainImage = result.secure_url;
            } else {
              imageUrls.push(result.secure_url);
            }
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError);
          }
        }
      }

      const product = await storage.createProduct({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        material: req.body.material,
        dimensions: req.body.dimensions,
        mainImage,
        galleryImages: imageUrls,
      });

      res.status(201).json(product);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ message: 'Failed to create product' });
    }
  });

  // Admin delete product (soft delete -> sets active=false)
  app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) return res.status(400).json({ message: 'Invalid product id' });
      const success = await storage.deleteProduct(id);
      if (!success) return res.status(404).json({ message: 'Product not found' });
      res.json({ success: true });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ message: 'Failed to delete product' });
    }
  });

  app.get('/api/admin/inventory', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const inventory = await storage.getInventory();
      res.json(inventory);
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  // Reports API
  app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
    try {
      console.log('Generating report with params:', req.query);
      const { type, range, startDate, endDate } = req.query;
      
      if (!type) {
        return res.status(400).json({ message: 'Report type is required' });
      }
      
      let reportData;
      let dateFilter = { startDate: undefined as string | undefined, endDate: undefined as string | undefined };

      // Calculate date range
      if (range === 'custom' && startDate && endDate) {
        dateFilter.startDate = startDate as string;
        dateFilter.endDate = endDate as string;
      } else if (range && range !== 'custom') {
        const now = new Date();
        const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
        const start = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        dateFilter.startDate = start.toISOString().split('T')[0];
        dateFilter.endDate = now.toISOString().split('T')[0];
      }

      console.log(`Generating ${type} report with date range:`, dateFilter);
      
      try {
        switch (type) {
          case 'sales':
            reportData = await storage.generateSalesReport(dateFilter.startDate, dateFilter.endDate);
            break;
          case 'inventory':
            reportData = await storage.generateInventoryReport();
            break;
          case 'customers':
            reportData = await storage.generateCustomerReport(dateFilter.startDate, dateFilter.endDate);
            break;
          case 'products':
            reportData = await storage.generateProductReport(dateFilter.startDate, dateFilter.endDate);
            break;
          case 'customDesigns':
            reportData = await storage.generateCustomDesignReport(dateFilter.startDate, dateFilter.endDate);
            break;
          case 'custom_designs':
            // Legacy support - redirect to customDesigns report
            console.log('Redirecting legacy custom_designs report type to customDesigns');
            reportData = await storage.generateCustomDesignReport(dateFilter.startDate, dateFilter.endDate);
            break;
          default:
            return res.status(400).json({ message: `Invalid report type: ${type}` });
        }
      } catch (error) {
        console.error(`Error generating ${type} report:`, error);
        return res.status(500).json({ 
          message: `Error generating ${type} report`, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Add general stats to all reports
      try {
        const dashboardStats = await storage.getDashboardStats();
        reportData = {
          ...reportData,
          totalCustomers: dashboardStats.totalUsers,
          totalProducts: dashboardStats.totalProducts,
          generatedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error getting dashboard stats:', error);
        // Continue without dashboard stats
      }

      console.log(`Successfully generated ${type} report with ${reportData?.inventoryData?.length || 0} inventory items`);
      res.json(reportData);
    } catch (error) {
      console.error('Generate report error:', error);
      res.status(500).json({ 
        message: 'Failed to generate report', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/admin/reports/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { type, range, startDate, endDate, format } = req.query;
      
      let reportData;
      let dateFilter = { startDate: undefined as string | undefined, endDate: undefined as string | undefined };

      if (range === 'custom' && startDate && endDate) {
        dateFilter.startDate = startDate as string;
        dateFilter.endDate = endDate as string;
      } else if (range && range !== 'custom') {
        const now = new Date();
        const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
        const start = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        dateFilter.startDate = start.toISOString().split('T')[0];
        dateFilter.endDate = now.toISOString().split('T')[0];
      }

      switch (type) {
        case 'sales':
          reportData = await storage.generateSalesReport(dateFilter.startDate, dateFilter.endDate);
          break;
        case 'inventory':
          reportData = await storage.generateInventoryReport();
          break;
        case 'customers':
          reportData = await storage.generateCustomerReport(dateFilter.startDate, dateFilter.endDate);
          break;
        case 'products':
          reportData = await storage.generateProductReport(dateFilter.startDate, dateFilter.endDate);
          break;
        case 'custom_designs':
          reportData = await storage.generateCustomDesignReport(dateFilter.startDate, dateFilter.endDate);
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      // Helper to convert array of objects to CSV
      const toCsv = (rows: any[], columns?: string[]) => {
        if (!rows || rows.length === 0) return '';
        const headers = columns || Object.keys(rows[0]);
        const escape = (val: any) => {
          const s = val === null || val === undefined ? '' : String(val);
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return '"' + s.replace(/"/g, '""') + '"';
          }
          return s;
        };
        const headerLine = headers.join(',');
        const lines = rows.map(row => headers.map(h => escape((row as any)[h])).join(','));
        return [headerLine, ...lines].join('\n');
      };

      // If CSV/Excel requested, build a reasonable dataset per report type
      if (format === 'csv' || format === 'excel') {
        let rows: any[] = [];
        let columns: string[] | undefined = undefined;
        switch (type) {
          case 'sales':
            rows = reportData.salesByMonth || [];
            columns = ['month', 'sales', 'orders'];
            break;
          case 'inventory':
            rows = reportData.inventoryData || [];
            columns = ['productId', 'name', 'category', 'price', 'quantity', 'costPrice', 'lastUpdated'];
            break;
          case 'customers':
            rows = reportData.topCustomers || [];
            columns = ['id', 'name', 'email', 'totalOrders', 'totalSpent'];
            break;
          case 'products':
            rows = reportData.productPerformance || [];
            columns = ['productId', 'name', 'category', 'price', 'totalSold', 'totalRevenue', 'orderCount'];
            break;
          case 'custom_designs':
            rows = reportData.recentRequests || [];
            columns = ['designId', 'customerName', 'furnitureType', 'status', 'quoteAmount', 'createdAt'];
            break;
        }
        const csv = toCsv(rows, columns);
        const filename = `${type}-report.${format === 'excel' ? 'csv' : 'csv'}`;
        res.setHeader('Content-Type', format === 'excel' ? 'text/csv' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
      }

      // Default to JSON (e.g., for pdf or unspecified): client can render or handle appropriately
      res.setHeader('Content-Type', 'application/json');
      return res.json(reportData);
    } catch (error) {
      console.error('Export report error:', error);
      res.status(500).json({ message: 'Failed to export report' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
