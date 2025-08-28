import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import nodemailer from "nodemailer";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  api_key: process.env.CLOUDINARY_API_KEY || "demo",
  api_secret: process.env.CLOUDINARY_API_SECRET || "demo",
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

// Multer configuration for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Rate limiting  
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  trustProxy: true, // Trust proxy headers in development
});

// Auth middleware
interface AuthRequest extends Express.Request {
  user?: { id: number; type: 'customer' | 'admin' };
}

const authenticateToken = async (req: AuthRequest, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const requireAdmin = (req: AuthRequest, res: any, next: any) => {
  if (req.user?.type !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

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
  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false,
  }));
  app.use(limiter);

  // Swagger documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

  /**
   * @swagger
   * components:
   *   schemas:
   *     Customer:
   *       type: object
   *       properties:
   *         customerId:
   *           type: integer
   *         name:
   *           type: string
   *         email:
   *           type: string
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
   *     summary: Register a new customer
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
   *         description: Customer registered successfully
   *       400:
   *         description: Registration failed
   */
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone, address } = req.body;

      // Check if customer already exists
      const existingCustomer = await storage.getCustomerByEmail(email);
      if (existingCustomer) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create customer
      const customer = await storage.createCustomer({
        name,
        email,
        passwordHash,
        phone,
        address,
      });

      // Create shopping cart
      await storage.createCart(customer.customerId);

      // Generate JWT token
      const token = jwt.sign(
        { id: customer.customerId, type: 'customer' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        customer: { ...customer, passwordHash: undefined },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
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
      const customer = await storage.getCustomerByEmail(email);
      if (!customer) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, customer.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: customer.customerId, type: 'customer' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        customer: { ...customer, passwordHash: undefined },
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

      // Generate JWT token
      const token = jwt.sign(
        { id: admin.adminId, type: 'admin' },
        JWT_SECRET,
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
      const customerId = req.user!.id;
      let cart = await storage.getCustomerCart(customerId);
      
      if (!cart) {
        cart = await storage.createCart(customerId);
      }

      const cartItems = await storage.getCartItems(cart.cartId);
      res.json({ cart, items: cartItems });
    } catch (error) {
      console.error('Get cart error:', error);
      res.status(500).json({ message: 'Failed to fetch cart' });
    }
  });

  app.post('/api/cart/items', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const customerId = req.user!.id;
      const { prodId, quantity, customNotes } = req.body;

      let cart = await storage.getCustomerCart(customerId);
      if (!cart) {
        cart = await storage.createCart(customerId);
      }

      const cartItem = await storage.addToCart(cart.cartId, {
        prodId,
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
      const customerId = req.user!.id;
      const { totalAmount, shippingAddress, paymentMethod } = req.body;

      // Get cart items
      const cart = await storage.getCustomerCart(customerId);
      if (!cart) {
        return res.status(400).json({ message: 'No cart found' });
      }

      const cartItems = await storage.getCartItems(cart.cartId);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // Create order
      const order = await storage.createOrder(
        {
          customerId,
          totalAmount,
          shippingAddress,
          paymentMethod,
          status: 'pending',
          paymentStatus: 'pending',
        },
        cartItems.map(item => ({
          prodId: item.cart_items.prodId!,
          quantity: item.cart_items.quantity,
          unitPrice: item.products.price,
        }))
      );

      // Clear cart
      await storage.clearCart(cart.cartId);

      // Send confirmation email
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@theuncommonroom.co.za',
          to: (await storage.getCustomer(customerId))?.email,
          subject: 'Order Confirmation - The Uncommon Room',
          html: `
            <h1>Thank you for your order!</h1>
            <p>Your order #UCR-${order.ordId} has been placed successfully.</p>
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
      const customerId = req.user!.id;
      const orders = await storage.getCustomerOrders(customerId);
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

      // Check if order belongs to customer (unless admin)
      if (req.user!.type === 'customer' && order.customerId !== req.user!.id) {
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

      const request = await storage.createCustomDesignRequest({
        customerId,
        furnitureType: req.body.furnitureType,
        dimensions: req.body.dimensions,
        materialPreference: req.body.materialPreference,
        colorPreference: req.body.colorPreference,
        specialRequirements: req.body.specialRequirements,
        budgetRange: req.body.budgetRange,
        referenceImages: imageUrls,
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
      const customers = await storage.getAllCustomers();
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

  app.get('/api/admin/inventory', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const inventory = await storage.getInventory();
      res.json(inventory);
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({ message: 'Failed to fetch inventory' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
