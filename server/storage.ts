import {
  customers,
  products,
  admins,
  shoppingCarts,
  cartItems,
  orders,
  orderItems,
  inquiries,
  customDesignRequests,
  inventory,
  deliveries,
  type Customer,
  type InsertCustomer,
  type Product,
  type InsertProduct,
  type Admin,
  type InsertAdmin,
  type ShoppingCart,
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
  // User operations (for compatibility)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  getAllCustomers(): Promise<Customer[]>;

  // Admin operations
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;

  // Product operations
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(filters?: { category?: string; minPrice?: number; maxPrice?: number; material?: string; search?: string }): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;

  // Shopping cart operations
  getCustomerCart(customerId: number): Promise<ShoppingCart | undefined>;
  createCart(customerId: number): Promise<ShoppingCart>;
  addToCart(cartId: number, item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: number, quantity: number, customNotes?: string): Promise<CartItem>;
  removeFromCart(id: number): Promise<boolean>;
  getCartItems(cartId: number): Promise<(CartItem & { product: Product })[]>;
  clearCart(cartId: number): Promise<boolean>;

  // Order operations
  createOrder(order: InsertOrder, items: { prodId: number; quantity: number; unitPrice: string }[]): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getCustomerOrders(customerId: number): Promise<Order[]>;
  getAllOrders(): Promise<(Order & { customer: Customer })[]>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]>;

  // Inquiry operations
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getAllInquiries(): Promise<Inquiry[]>;
  updateInquiryStatus(id: number, status: string): Promise<Inquiry>;

  // Custom design operations
  createCustomDesignRequest(request: InsertCustomDesignRequest): Promise<CustomDesignRequest>;
  getAllCustomDesignRequests(): Promise<(CustomDesignRequest & { customer: Customer })[]>;
  updateCustomDesignStatus(id: number, status: string, quoteAmount?: string): Promise<CustomDesignRequest>;

  // Inventory operations
  getInventory(): Promise<(Inventory & { product: Product })[]>;
  updateInventory(prodId: number, quantity: number): Promise<Inventory>;

  // Analytics operations
  getDashboardStats(): Promise<{
    totalOrders: number;
    totalRevenue: string;
    totalProducts: number;
    totalCustomers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (for compatibility)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(customers).where(eq(customers.customerId, parseInt(id)));
    return user as any;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(customers).where(eq(customers.email, username));
    return user as any;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(customers).values({
      name: insertUser.username,
      email: insertUser.username,
      passwordHash: insertUser.password,
    }).returning();
    return user as any;
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.customerId, id));
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.customerId, id))
      .returning();
    return updatedCustomer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
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
  async getCustomerCart(customerId: number): Promise<ShoppingCart | undefined> {
    const [cart] = await db.select().from(shoppingCarts).where(eq(shoppingCarts.customerId, customerId));
    return cart;
  }

  async createCart(customerId: number): Promise<ShoppingCart> {
    const [cart] = await db.insert(shoppingCarts).values({ customerId }).returning();
    return cart;
  }

  async addToCart(cartId: number, item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists
    const [existingItem] = await db.select().from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.prodId, item.prodId!)));

    if (existingItem) {
      // Update existing item
      const [updatedItem] = await db
        .update(cartItems)
        .set({ 
          quantity: existingItem.quantity + (item.quantity || 1),
          customNotes: item.customNotes || existingItem.customNotes
        })
        .where(eq(cartItems.cartItemId, existingItem.cartItemId))
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
      .where(eq(cartItems.cartItemId, id))
      .returning();
    return updatedItem;
  }

  async removeFromCart(id: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.cartItemId, id));
    return result.rowCount > 0;
  }

  async getCartItems(cartId: number): Promise<(CartItem & { product: Product })[]> {
    return await db
      .select()
      .from(cartItems)
      .innerJoin(products, eq(cartItems.prodId, products.prodId))
      .where(eq(cartItems.cartId, cartId));
  }

  async clearCart(cartId: number): Promise<boolean> {
    const result = await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    return result.rowCount >= 0;
  }

  // Order operations
  async createOrder(order: InsertOrder, items: { prodId: number; quantity: number; unitPrice: string }[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    // Add order items
    for (const item of items) {
      await db.insert(orderItems).values({
        ordId: newOrder.ordId,
        prodId: item.prodId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
    }

    return newOrder;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.ordId, id));
    return order;
  }

  async getCustomerOrders(customerId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<(Order & { customer: Customer })[]> {
    return await db
      .select()
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.customerId))
      .orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.ordId, id))
      .returning();
    return updatedOrder;
  }

  async getOrderItems(orderId: number): Promise<(OrderItem & { product: Product })[]> {
    return await db
      .select()
      .from(orderItems)
      .innerJoin(products, eq(orderItems.prodId, products.prodId))
      .where(eq(orderItems.ordId, orderId));
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
      .where(eq(inquiries.inquiryId, id))
      .returning();
    return updatedInquiry;
  }

  // Custom design operations
  async createCustomDesignRequest(request: InsertCustomDesignRequest): Promise<CustomDesignRequest> {
    const [newRequest] = await db.insert(customDesignRequests).values(request).returning();
    return newRequest;
  }

  async getAllCustomDesignRequests(): Promise<(CustomDesignRequest & { customer: Customer })[]> {
    return await db
      .select()
      .from(customDesignRequests)
      .innerJoin(customers, eq(customDesignRequests.customerId, customers.customerId))
      .orderBy(desc(customDesignRequests.createdAt));
  }

  async updateCustomDesignStatus(id: number, status: string, quoteAmount?: string): Promise<CustomDesignRequest> {
    const updateData: any = { status: status as any, updatedAt: new Date() };
    if (quoteAmount) {
      updateData.quoteAmount = quoteAmount;
    }

    const [updatedRequest] = await db
      .update(customDesignRequests)
      .set(updateData)
      .where(eq(customDesignRequests.designId, id))
      .returning();
    return updatedRequest;
  }

  // Inventory operations
  async getInventory(): Promise<(Inventory & { product: Product })[]> {
    return await db
      .select()
      .from(inventory)
      .innerJoin(products, eq(inventory.prodId, products.prodId))
      .orderBy(asc(products.name));
  }

  async updateInventory(prodId: number, quantity: number): Promise<Inventory> {
    // Check if inventory record exists
    const [existingInventory] = await db.select().from(inventory).where(eq(inventory.prodId, prodId));

    if (existingInventory) {
      const [updatedInventory] = await db
        .update(inventory)
        .set({ quantity, lastUpdated: new Date() })
        .where(eq(inventory.prodId, prodId))
        .returning();
      return updatedInventory;
    } else {
      const [newInventory] = await db
        .insert(inventory)
        .values({ prodId, quantity, lastUpdated: new Date() })
        .returning();
      return newInventory;
    }
  }

  // Analytics operations
  async getDashboardStats(): Promise<{
    totalOrders: number;
    totalRevenue: string;
    totalProducts: number;
    totalCustomers: number;
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

    const [customerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);

    return {
      totalOrders: orderStats.count || 0,
      totalRevenue: orderStats.totalRevenue || "0",
      totalProducts: productCount.count || 0,
      totalCustomers: customerCount.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
