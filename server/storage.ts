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

// Define Admin types since they're missing from schema
type Admin = typeof admins.$inferSelect;
type InsertAdmin = typeof admins.$inferInsert;

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
    let conditions = [eq(products.active, true)];
    
    if (filters?.category) {
      conditions.push(eq(products.category, filters.category as any));
    }
    if (filters?.minPrice) {
      conditions.push(gte(products.price, filters.minPrice.toString()));
    }
    if (filters?.maxPrice) {
      conditions.push(lte(products.price, filters.maxPrice.toString()));
    }
    if (filters?.material) {
      conditions.push(sql`${products.material} ILIKE ${'%' + filters.material + '%'}`);
    }
    if (filters?.search) {
      conditions.push(sql`${products.name} ILIKE ${'%' + filters.search + '%'}`);
    }

    const query = db
      .select()
      .from(products)
      .where(and(...conditions));

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
    let conditions = [];

    if (filters?.category) {
      conditions.push(eq(products.category, filters.category as any));
    }
    if (filters?.minPrice) {
      conditions.push(gte(products.price, filters.minPrice.toString()));
    }
    if (filters?.maxPrice) {
      conditions.push(lte(products.price, filters.maxPrice.toString()));
    }
    if (filters?.material) {
      conditions.push(sql`${products.material} ILIKE ${'%' + filters.material + '%'}`);
    }
    if (filters?.search) {
      conditions.push(sql`${products.name} ILIKE ${'%' + filters.search + '%'}`);
    }

    return await db
      .select()
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const productToInsert = {
      ...product,
      galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages.map(String) : []
    } as const;
    const [newProduct] = await db.insert(products).values(productToInsert).returning();
    return newProduct;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const updateData = {
      ...product,
      updatedAt: new Date(),
      galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages.map(String) : product.galleryImages
    };
    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
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

  async getAllCustomDesignRequests(): Promise<(CustomDesignRequest & { user: User })[]> {
    const result = await db
      .select({
        id: customDesignRequests.id,
        userId: customDesignRequests.userId,
        furnitureType: customDesignRequests.furnitureType,
        dimensions: customDesignRequests.dimensions,
        materialPreference: customDesignRequests.materialPreference,
        colorPreference: customDesignRequests.colorPreference,
        specialRequirements: customDesignRequests.specialRequirements,
        referenceImages: customDesignRequests.referenceImages,
        referenceLinks: customDesignRequests.referenceLinks,
        budgetRange: customDesignRequests.budgetRange,
        status: customDesignRequests.status,
        quoteAmount: customDesignRequests.quoteAmount,
        createdAt: customDesignRequests.createdAt,
        updatedAt: customDesignRequests.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          passwordHash: users.passwordHash,
          role: users.role,
          phone: users.phone,
          address: users.address,
          refreshToken: users.refreshToken,
          adminId: users.adminId,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(customDesignRequests)
      .innerJoin(users, eq(customDesignRequests.userId, users.id))
      .orderBy(desc(customDesignRequests.createdAt));
    
    return result as (CustomDesignRequest & { user: User })[];
  }

  async updateCustomDesignStatus(id: number, status: string, quoteAmount?: string): Promise<CustomDesignRequest> {
    if (isNaN(id)) {
      throw new Error(`Invalid design ID: ${id}`);
    }
    
    const updateData: any = { status: status as any, updatedAt: new Date() };
    
    if (quoteAmount && quoteAmount.trim() !== '') {
      const parsedAmount = parseFloat(quoteAmount);
      if (!isNaN(parsedAmount)) {
        updateData.quoteAmount = parsedAmount.toString();
      }
    }

    console.log(`Updating custom design ${id} with data:`, updateData);
    
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
    try {
      console.log('Generating inventory report...');
      
      // First check if we have any inventory records
      const inventoryCount = await db
        .select({ count: sql`count(*)` })
        .from(inventory)
        .then((result: Array<{ count: string | number }>) => Number(result[0].count));
        
      console.log(`Found ${inventoryCount} inventory records`);
      
      if (inventoryCount === 0) {
        // If no inventory records, fetch just products as placeholders
        const productsData = await db
          .select({
            productId: products.prodId,
            name: products.name,
            category: products.category,
            price: products.price,
          })
          .from(products)
          .where(eq(products.active, true))
          .orderBy(products.name);
          
        console.log(`Using ${productsData.length} products as placeholders for inventory`);
        
        // Helper function to safely parse numbers
        const parseNumber = (value: any): number => {
          if (value === null || value === undefined) return 0;
          if (typeof value === 'number') return value;
          if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return !isNaN(parsed) ? parsed : 0;
          }
          return 0;
        };
        
        // Create normalized inventory data from products
        const inventoryData = productsData.map((product: any) => ({
          productId: parseNumber(product.productId),
          name: typeof product.name === 'string' ? product.name : 'Unknown',
          category: typeof product.category === 'string' ? product.category : 'N/A',
          price: parseNumber(product.price),
          quantity: 0,
          costPrice: "0.00",
          lastUpdated: new Date().toISOString()
        }));
        
        const report = {
          totalProducts: inventoryData.length,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: inventoryData.length,
          inventoryData,
        };
        
        console.log('Generated placeholder inventory report with zero quantities');
        return report;
      }
      
      // Normal flow with inventory records
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

      console.log(`Successfully retrieved ${inventoryData.length} inventory items`);

      // Helper function to safely parse numbers
      const parseNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
      };

      // Log some sample items for debugging
      if (inventoryData.length > 0) {
        console.log('Sample inventory item (raw):', JSON.stringify(inventoryData[0]));
      }
      
      // Normalize all inventory data to ensure consistent types
      const normalizedInventory = inventoryData.map((item: any) => ({
        productId: parseNumber(item.productId),
        name: typeof item.name === 'string' ? item.name : 'Unknown',
        category: typeof item.category === 'string' ? item.category : 'N/A',
        price: parseNumber(item.price),
        quantity: parseNumber(item.quantity),
        costPrice: item.costPrice || '0',
        lastUpdated: item.lastUpdated || new Date().toISOString()
      }));
      
      if (normalizedInventory.length > 0) {
        console.log('Sample inventory item (normalized):', JSON.stringify(normalizedInventory[0]));
      }

      const lowStockItems = normalizedInventory.filter((item: any) => item.quantity <= 5 && item.quantity > 0);
      const outOfStockItems = normalizedInventory.filter((item: any) => item.quantity === 0);

      const totalValue = normalizedInventory.reduce((sum: number, item: any) => {
        return sum + (item.price * item.quantity);
      }, 0);

      // Return normalized report data with consistent types
      const report = {
        totalProducts: normalizedInventory.length,
        totalValue: parseFloat(totalValue.toFixed(2)),  // Return as number, not string
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        inventoryData: normalizedInventory,
      };
      
      console.log('Inventory report summary:');
      console.log(`- Total products: ${report.totalProducts}`);
      console.log(`- Total value: ${report.totalValue}`);
      console.log(`- Low stock items: ${report.lowStockItems}`);
      console.log(`- Out of stock items: ${report.outOfStockItems}`);
      
      return report;
    } catch (error) {
      console.error('Error generating inventory report:', error);
      // Return a basic structure so the UI doesn't break
      const errorMessage = error instanceof Error ? error.message : 'Unknown error generating inventory report';
      console.error(errorMessage);
      
      return {
        totalProducts: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        inventoryData: [],
        error: errorMessage
      };
    }
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
    try {
      console.log('Generating custom design report...');
      let whereClause = sql`1=1`;
      
      if (startDate && endDate) {
        whereClause = sql`${customDesignRequests.createdAt} >= ${startDate} AND ${customDesignRequests.createdAt} <= ${endDate}`;
      }

      // First check if we have any custom design requests
      const designCount = await db
        .select({ count: sql`count(*)` })
        .from(customDesignRequests)
        .then((result: Array<{ count: string | number }>) => Number(result[0].count));
        
      console.log(`Found ${designCount} custom design requests`);
      
      if (designCount === 0) {
        // If no records, return an empty report structure
        console.log('No custom design requests found, returning empty report');
        return {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          customDesignsData: [],
          statusBreakdown: [],
          recentRequests: [],
        };
      }

      try {
        // Count requests by status for summary stats
        const statusCountsPromise = db
          .select({
            status: customDesignRequests.status,
            count: sql<number>`count(*)`,
          })
          .from(customDesignRequests)
          .where(whereClause)
          .groupBy(customDesignRequests.status);
        
        // Get all custom design requests with user info
        // Use a simplified query first to determine available columns
        const columnsCheck = await db.query.customDesignRequests.findFirst({
          with: { user: true },
        });
        
        console.log('Available custom design fields:', Object.keys(columnsCheck || {}));
        
        // Adapt the query based on schema
        const hasReferenceLinks = columnsCheck && 'referenceLinks' in columnsCheck;
        console.log(`Schema ${hasReferenceLinks ? 'has' : 'does not have'} referenceLinks field`);
        
        // Get all custom design requests with user info
        const customDesignsDataPromise = db
          .select({
            id: customDesignRequests.id,
            customer_name: users.name,
            customer_email: users.email,
            status: customDesignRequests.status,
            furniture_type: customDesignRequests.furnitureType,
            special_requirements: customDesignRequests.specialRequirements,
            budget: customDesignRequests.budgetRange,
            material_preference: customDesignRequests.materialPreference,
            reference_links: customDesignRequests.referenceLinks,
            created_at: customDesignRequests.createdAt,
          })
          .from(customDesignRequests)
          .innerJoin(users, eq(customDesignRequests.userId, users.id))
          .where(whereClause)
          .orderBy(desc(customDesignRequests.createdAt));

        // Legacy format - kept for backward compatibility
        const recentRequestsPromise = db
          .select({
            designId: customDesignRequests.id, // Use id instead of designId
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

        // Wait for all queries to complete
        const [statusCounts, customDesignsData, recentRequests] = await Promise.all([
          statusCountsPromise,
          customDesignsDataPromise,
          recentRequestsPromise
        ]);

        console.log(`Retrieved ${customDesignsData.length} custom design records`);

        // Count totals by status
        const pendingRequests = statusCounts.find((s: any) => s.status === 'pending')?.count || 0;
        const approvedRequests = statusCounts.find((s: any) => s.status === 'approved')?.count || 0;
        const rejectedRequests = statusCounts.find((s: any) => s.status === 'rejected')?.count || 0;
        const totalRequests = statusCounts.reduce((sum: number, item: any) => sum + Number(item.count), 0);

        // Format data according to both new and legacy formats
        return {
          // New format
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          customDesignsData: customDesignsData.map((item: any) => {
            // Use either id or designId
            const id = item.id || item.designId || 0;
            return {
              id: Number(id),
              customer_name: item.customer_name || 'Unknown',
              customer_email: item.customer_email || 'No email provided',
              status: item.status || 'Pending',
              description: item.description || 'No description',
              budget: item.budget || '0',
              timeline: item.timeline || 'N/A',
              reference_links: item.reference_links || [],
              created_at: item.created_at || new Date().toISOString()
            };
          }),
          
          // Legacy format
          statusBreakdown: statusCounts,
          recentRequests,
        };
      } catch (error) {
        // If error is with reference_links, try with a fallback query
        console.error('Error in first attempt at custom design report:', error);
        
        // Fallback query without potentially problematic fields
        const statusCounts = await db
          .select({
            status: customDesignRequests.status,
            count: sql<number>`count(*)`,
          })
          .from(customDesignRequests)
          .where(whereClause)
          .groupBy(customDesignRequests.status);
          
        const customDesignsData = await db
          .select({
            id: customDesignRequests.id, // Use id instead of designId
            customer_name: users.name,
            customer_email: users.email,
            status: customDesignRequests.status,
            budget: customDesignRequests.budgetRange,
            created_at: customDesignRequests.createdAt,
          })
          .from(customDesignRequests)
          .innerJoin(users, eq(customDesignRequests.userId, users.id))
          .where(whereClause)
          .orderBy(desc(customDesignRequests.createdAt));
          
        const pendingRequests = statusCounts.find((s: any) => s.status === 'pending')?.count || 0;
        const approvedRequests = statusCounts.find((s: any) => s.status === 'approved')?.count || 0;
        const rejectedRequests = statusCounts.find((s: any) => s.status === 'rejected')?.count || 0;
        const totalRequests = statusCounts.reduce((sum: number, item: any) => sum + Number(item.count), 0);
        
        return {
          totalRequests,
          pendingRequests,
          approvedRequests,
          rejectedRequests,
          customDesignsData: customDesignsData.map((item: any) => ({
            ...item,
            id: Number(item.id),
            description: 'No description available',
            timeline: 'N/A',
            reference_links: [],
            budget: item.budget || '0',
            customer_name: item.customer_name || 'Unknown'
          })),
          statusBreakdown: statusCounts,
          recentRequests: [],
        };
      }
    } catch (error) {
      console.error('Error generating custom design report:', error);
      // Return a basic structure so the UI doesn't break
      return {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        customDesignsData: [],
        statusBreakdown: [],
        recentRequests: [],
        error: error instanceof Error ? error.message : 'Unknown error generating custom design report'
      };
    }
  }
}

export const storage = new DatabaseStorage();
