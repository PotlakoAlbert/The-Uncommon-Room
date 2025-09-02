import {
  users,
  products,
  admins,
  carts,
  cartItems,
  orders,
  orderItems,
  inquiries,
  customDesignRequests,
  inventory,
  deliveries,
  type Product,
  type InsertProduct,
  type Admin,
  type InsertAdmin,
  type Cart,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type Inquiry,
  type InsertInquiry,
  type CustomDesignRequest,
  type InsertCustomDesignRequest,
  type Inventory,
  type Delivery,
  type User,
  type InsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, like, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(filters?: { category?: string; minPrice?: number; maxPrice?: number; material?: string; search?: string }): Promise<Product[]>;
  getAllProductsForAdmin(filters?: { category?: string; minPrice?: number; maxPrice?: number; material?: string; search?: string }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;

  // Shopping cart operations
  getCart(userId: number): Promise<Cart | undefined>;
  createCart(userId: number): Promise<Cart>;
  addToCart(cartId: number, item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number, customNotes?: string): Promise<CartItem>;
  removeFromCart(id: number): Promise<boolean>;
  getCartItems(cartId: number): Promise<(CartItem & { product: Product })[]>;
  clearCart(cartId: number): Promise<boolean>;

  // Order operations
  createOrder(order: InsertOrder, items: { productId: number; quantity: number; unitPrice: string }[]): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  getAllOrders(): Promise<(Order & { user: User })[]>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]>;

  // Inquiry operations
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getAllInquiries(): Promise<Inquiry[]>;
  updateInquiryStatus(id: number, status: string): Promise<Inquiry>;

  // Custom design operations
  createCustomDesignRequest(request: InsertCustomDesignRequest): Promise<CustomDesignRequest>;
  getAllCustomDesignRequests(): Promise<(CustomDesignRequest & { user: User })[]>;
  updateCustomDesignStatus(id: number, status: string, quoteAmount?: string): Promise<CustomDesignRequest>;

  // Inventory operations
  getInventory(): Promise<(Inventory & { product: Product })[]>;
  updateInventory(productId: number, quantity: number): Promise<Inventory>;

  // Analytics operations
  getDashboardStats(): Promise<{
    totalOrders: number;
    totalRevenue: string;
    totalProducts: number;
    totalUsers: number;
  }>;

  // Report operations
  generateSalesReport(startDate?: string, endDate?: string): Promise<any>;
  generateInventoryReport(): Promise<any>;
  generateCustomerReport(startDate?: string, endDate?: string): Promise<any>;
  generateProductReport(startDate?: string, endDate?: string): Promise<any>;
  generateCustomDesignReport(startDate?: string, endDate?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Admin operations
  async getAdmin(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.adminId, id));
    return admin;
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    
    // Also create a corresponding user record
    try {
      await this.createUser({
        name: newAdmin.name,
        email: newAdmin.email,
        passwordHash: newAdmin.passwordHash,
        role: 'admin',
        phone: newAdmin.phone,
        address: newAdmin.address,
        adminId: newAdmin.adminId
      });
    } catch (error) {
      console.error('Failed to create user record for admin:', error);
      // Don't throw here as the admin was created successfully
    }
    
    return newAdmin;
  }

  // Product operations
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.prodId, id));
    return product;
  }

  async getAllProducts(filters?: { 
    category?: string; 
    minPrice?: number; 
    maxPrice?: number; 
    material?: string; 
    search?: string 
  }): Promise<Product[]> {
    let query = db.select().from(products).where(eq(products.active, true));

    if (filters?.category) {
      query = query.where(eq(products.category, filters.category as any));
    }
    if (filters?.minPrice) {
      query = query.where(gte(products.price, filters.minPrice.toString()));
    }
    if (filters?.maxPrice) {
      query = query.where(lte(products.price, filters.maxPrice.toString()));
    }
    if (filters?.material) {
      query = query.where(like(products.material, `%${filters.material}%`));
    }
    if (filters?.search) {
      query = query.where(like(products.name, `%${filters.search}%`));
    }

    return await query.orderBy(desc(products.createdAt));
  }

  async getAllProductsForAdmin(filters?: { 
    category?: string; 
    minPrice?: number; 
    maxPrice?: number; 
    material?: string; 
    search?: string 
  }): Promise<Product[]> {
    // For admin, get all products (including inactive ones)
    let query = db.select().from(products);

    if (filters?.category) {
      query = query.where(eq(products.category, filters.category as any));
    }
    if (filters?.minPrice) {
      query = query.where(gte(products.price, filters.minPrice.toString()));
    }
    if (filters?.maxPrice) {
      query = query.where(lte(products.price, filters.maxPrice.toString()));
    }
    if (filters?.material) {
      query = query.where(like(products.material, `%${filters.material}%`));
    }
    if (filters?.search) {
      query = query.where(like(products.name, `%${filters.search}%`));
    }

    return await query.orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.prodId, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const [updatedProduct] = await db
      .update(products)
      .set({ active: false })
      .where(eq(products.prodId, id))
      .returning();
    return !!updatedProduct;
  }

  // Shopping cart operations
  async getCart(userId: number): Promise<Cart | undefined> {
    const [cart] = await db.select().from(carts).where(eq(carts.userId, userId));
    return cart;
  }

  async createCart(userId: number): Promise<Cart> {
    const [cart] = await db.insert(carts).values({ userId }).returning();
    return cart;
  }

  async addToCart(cartId: number, item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const [existingItem] = await db.select().from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, item.productId!)));

    if (existingItem) {
      // Update existing item
      const [updatedItem] = await db
        .update(cartItems)
        .set({ 
          quantity: existingItem.quantity + (item.quantity || 1),
          customNotes: item.customNotes || existingItem.customNotes
        })
        .where(eq(cartItems.id, existingItem.id))
        .returning();
      return updatedItem;
    } else {
      // Create new item
      const [newItem] = await db.insert(cartItems).values({ ...item, cartId }).returning();
      return newItem;
    }
  }

  async updateCartItem(id: number, quantity: number, customNotes?: string): Promise<CartItem> {
    const updateData: any = { quantity };
    if (customNotes !== undefined) {
      updateData.customNotes = customNotes;
    }
    
    const [updatedItem] = await db
      .update(cartItems)
      .set(updateData)
      .where(eq(cartItems.id, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.id, id));
    return result.rowCount > 0;
  }

  async getCartItems(cartId: number): Promise<(CartItem & { product: Product })[]> {
    const result = await db
      .select({
        // Cart item fields
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        customNotes: cartItems.customNotes,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt,
        // Product fields
        product: {
          prodId: products.prodId,
          name: products.name,
          description: products.description,
          price: products.price,
          category: products.category,
          active: products.active,
          mainImage: products.mainImage,
          galleryImages: products.galleryImages,
          material: products.material,
          dimensions: products.dimensions,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
        }
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.prodId))
      .where(eq(cartItems.cartId, cartId));
    
    return result as any;
  }

  async clearCart(cartId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    return result.rowCount >= 0;
  }

  // Order operations
  async createOrder(order: InsertOrder, items: { productId: number; quantity: number; unitPrice: string }[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    // Add order items
    for (const item of items) {
      await db.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    return newOrder;
  }

  async getOrder(id: number): Promise<any | undefined> {
    const [order] = await db
      .select({
        ordId: orders.id,
        userId: orders.userId,
        orderDate: orders.orderDate,
        status: orders.status,
        totalAmount: orders.totalAmount,
        shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.id, id));
    return order;
  }

  async getUserOrders(userId: number): Promise<any[]> {
    return await db
      .select({
        ordId: orders.id,
        userId: orders.userId,
        orderDate: orders.orderDate,
        status: orders.status,
        totalAmount: orders.totalAmount,
        shippingAddress: orders.shippingAddress,
        paymentMethod: orders.paymentMethod,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<any[]> {
    return await db
      .select({
        orders: {
          ordId: orders.id,
          userId: orders.userId,
          orderDate: orders.orderDate,
          status: orders.status,
          totalAmount: orders.totalAmount,
          shippingAddress: orders.shippingAddress,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        },
        customers: {
          customerId: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          address: users.address,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]> {
    return await db
      .select()
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.prodId))
      .where(eq(orderItems.orderId, orderId));
  }

  // Inquiry operations
  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [newInquiry] = await db.insert(inquiries).values(inquiry).returning();
    return newInquiry;
  }

  async getAllInquiries(): Promise<Inquiry[]> {
    return await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
  }

  async updateInquiryStatus(id: number, status: string): Promise<Inquiry> {
    const [updatedInquiry] = await db
      .update(inquiries)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(inquiries.id, id))
      .returning();
    return updatedInquiry;
  }

  // Custom design operations
  async createCustomDesignRequest(request: InsertCustomDesignRequest): Promise<CustomDesignRequest> {
    const [newRequest] = await db.insert(customDesignRequests).values(request).returning();
    return newRequest;
  }

  async getAllCustomDesignRequests(): Promise<({
    custom_design_requests: CustomDesignRequest & { designId: number };
    users: User;
  })[]> {
    return await db
      .select()
      .from(customDesignRequests)
      .innerJoin(users, eq(customDesignRequests.userId, users.id))
      .orderBy(desc(customDesignRequests.createdAt)) as any;
  }

  async updateCustomDesignStatus(id: number, status: string, quoteAmount?: string): Promise<CustomDesignRequest> {
    const updateData: any = { status: status as any, updatedAt: new Date() };
    if (quoteAmount) {
      updateData.quoteAmount = quoteAmount;
    }

    const [updatedRequest] = await db
      .update(customDesignRequests)
      .set(updateData)
      .where(eq(customDesignRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Inventory operations
  async getInventory(): Promise<(Inventory & { product: Product })[]> {
    return await db
      .select()
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.prodId))
      .orderBy(asc(products.name));
  }

  async updateInventory(productId: number, quantity: number): Promise<Inventory> {
    // Check if inventory record exists
    const [existingInventory] = await db.select().from(inventory).where(eq(inventory.productId, productId));

    if (existingInventory) {
      const [updatedInventory] = await db
        .update(inventory)
        .set({ quantity, lastUpdated: new Date() })
        .where(eq(inventory.productId, productId))
        .returning();
      return updatedInventory;
    } else {
      const [newInventory] = await db
        .insert(inventory)
        .values({ productId, quantity, lastUpdated: new Date() })
        .returning();
      return newInventory;
    }
  }

  // Analytics operations
  async getDashboardStats(): Promise<{
    totalOrders: number;
    totalRevenue: string;
    totalProducts: number;
    totalUsers: number;
  }> {
    const [orderStats] = await db
      .select({
        count: sql<number>`count(*)`,
        totalRevenue: sql<string>`coalesce(sum(total_amount), 0)`,
      })
      .from(orders);

    const [productCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.active, true));

    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    return {
      totalOrders: orderStats.count || 0,
      totalRevenue: orderStats.totalRevenue || "0",
      totalProducts: productCount.count || 0,
      totalUsers: userCount.count || 0,
    };
  }

  // Report operations
  async generateSalesReport(startDate?: string, endDate?: string): Promise<any> {
    // Build date filter conditions
    let dateFilter = sql`1=1`;
    if (startDate && endDate) {
      dateFilter = sql`${orders.createdAt} >= ${startDate} AND ${orders.createdAt} <= ${endDate}`;
    }

    // Total sales and orders
    const [salesStats] = await db
      .select({
        totalSales: sql<number>`coalesce(sum(total_amount), 0)`,
        totalOrders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(dateFilter);

    // Top selling products
    const topProducts = await db
      .select({
        name: products.name,
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        revenue: sql<number>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`,
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.prodId))
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(dateFilter)
      .groupBy(products.prodId, products.name)
      .orderBy(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0) DESC`)
      .limit(10);

    // Recent orders
    const recentOrders = await db
      .select({
        id: orders.id,
        customerName: users.name,
        total: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(dateFilter)
      .orderBy(desc(orders.createdAt))
      .limit(10);

    // Sales by month
    const salesByMonth = await db
      .select({
        month: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM')`,
        sales: sql<number>`coalesce(sum(total_amount), 0)`,
        orders: sql<number>`count(*)`,
      })
      .from(orders)
      .where(dateFilter)
      .groupBy(sql`to_char(${orders.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'YYYY-MM') DESC`)
      .limit(12);

    return {
      totalSales: parseFloat(salesStats.totalSales?.toString() || '0'),
      totalOrders: salesStats.totalOrders || 0,
      topSellingProducts: topProducts,
      recentOrders,
      salesByMonth,
    };
  }

  async generateInventoryReport(): Promise<any> {
    const inventoryData = await db
      .select({
        productId: products.prodId,
        name: products.name,
        category: products.category,
        price: products.price,
        quantity: inventory.quantity,
        costPrice: inventory.costPrice,
        lastUpdated: inventory.lastUpdated,
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.prodId))
      .orderBy(products.name);

    const lowStockItems = inventoryData.filter(item => item.quantity <= 5);
    const outOfStockItems = inventoryData.filter(item => item.quantity === 0);

    return {
      totalProducts: inventoryData.length,
      totalValue: inventoryData.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0),
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      inventoryData,
      lowStockItems,
      outOfStockItems,
    };
  }

  async generateCustomerReport(startDate?: string, endDate?: string): Promise<any> {
    // Build date filter conditions
    let dateFilter = sql`1=1`;
    if (startDate && endDate) {
      dateFilter = sql`${users.createdAt} >= ${startDate} AND ${users.createdAt} <= ${endDate}`;
    }

    const [customerStats] = await db
      .select({
        totalCustomers: sql<number>`count(*)`,
        newCustomers: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(eq(users.role, 'user'), dateFilter));

    const topCustomers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        totalOrders: sql<number>`count(${orders.id})`,
        totalSpent: sql<number>`coalesce(sum(${orders.totalAmount}), 0)`,
      })
      .from(users)
      .leftJoin(orders, eq(users.id, orders.userId))
      .where(eq(users.role, 'user'))
      .groupBy(users.id, users.name, users.email)
      .orderBy(sql`coalesce(sum(${orders.totalAmount}), 0) DESC`)
      .limit(10);

    return {
      totalCustomers: customerStats.totalCustomers || 0,
      newCustomers: customerStats.newCustomers || 0,
      topCustomers,
    };
  }

  async generateProductReport(startDate?: string, endDate?: string): Promise<any> {
    const [productStats] = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        activeProducts: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.active, true));

    const productPerformance = await db
      .select({
        productId: products.prodId,
        name: products.name,
        category: products.category,
        price: products.price,
        totalSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`,
        totalRevenue: sql<number>`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0)`,
        orderCount: sql<number>`count(distinct ${orderItems.orderId})`,
      })
      .from(products)
      .leftJoin(orderItems, eq(products.prodId, orderItems.productId))
      .leftJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(products.active, true))
      .groupBy(products.prodId, products.name, products.category, products.price)
      .orderBy(sql`coalesce(sum(${orderItems.quantity} * ${orderItems.unitPrice}), 0) DESC`);

    return {
      totalProducts: productStats.totalProducts || 0,
      activeProducts: productStats.activeProducts || 0,
      productPerformance,
    };
  }

  async generateCustomDesignReport(startDate?: string, endDate?: string): Promise<any> {
    let whereClause = sql`1=1`;
    
    if (startDate && endDate) {
      whereClause = sql`${customDesignRequests.createdAt} >= ${startDate} AND ${customDesignRequests.createdAt} <= ${endDate}`;
    }

    const [designStats] = await db
      .select({
        totalRequests: sql<number>`count(*)`,
        pendingRequests: sql<number>`count(*)`,
      })
      .from(customDesignRequests)
      .where(whereClause);

    const statusBreakdown = await db
      .select({
        status: customDesignRequests.status,
        count: sql<number>`count(*)`,
      })
      .from(customDesignRequests)
      .where(whereClause)
      .groupBy(customDesignRequests.status);

    const recentRequests = await db
      .select({
        designId: customDesignRequests.designId,
        customerName: users.name,
        furnitureType: customDesignRequests.furnitureType,
        status: customDesignRequests.status,
        quoteAmount: customDesignRequests.quoteAmount,
        createdAt: customDesignRequests.createdAt,
      })
      .from(customDesignRequests)
      .innerJoin(users, eq(customDesignRequests.userId, users.id))
      .where(whereClause)
      .orderBy(desc(customDesignRequests.createdAt))
      .limit(10);

    return {
      totalRequests: designStats.totalRequests || 0,
      pendingRequests: designStats.pendingRequests || 0,
      statusBreakdown,
      recentRequests,
    };
  }
}

export const storage = new DatabaseStorage();
