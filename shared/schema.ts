import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  integer,
  json,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const categoryEnum = pgEnum("category", [
  "headboards",
  "tables", 
  "seating",
  "storage",
  "custom"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed", 
  "in_production",
  "ready",
  "delivered",
  "cancelled"
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "eft", 
  "card"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "refunded"
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "dispatched",
  "in_transit", 
  "delivered",
  "failed"
]);

export const inquiryTypeEnum = pgEnum("inquiry_type", [
  "general",
  "product",
  "custom_design",
  "quote"
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "responded",
  "closed"
]);

export const designStatusEnum = pgEnum("design_status", [
  "submitted",
  "under_review",
  "quoted",
  "approved", 
  "rejected"
]);

// Tables
export const customers = pgTable("customers", {
  customerId: serial("customer_id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  prodId: serial("prod_id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: categoryEnum("category").notNull(),
  active: boolean("active").default(true),
  mainImage: text("main_image"),
  galleryImages: json("gallery_images").$type<string[]>().default([]),
  material: varchar("material", { length: 100 }),
  dimensions: varchar("dimensions", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("admins", {
  adminId: serial("admin_id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shoppingCarts = pgTable("shopping_carts", {
  cartId: serial("cart_id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.customerId),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  cartItemId: serial("cart_item_id").primaryKey(),
  cartId: integer("cart_id").references(() => shoppingCarts.cartId),
  prodId: integer("prod_id").references(() => products.prodId),
  quantity: integer("quantity").notNull().default(1),
  customNotes: text("custom_notes"),
});

export const orders = pgTable("orders", {
  ordId: serial("ord_id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.customerId),
  orderDate: timestamp("order_date").defaultNow(),
  status: orderStatusEnum("status").default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: text("shipping_address"),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  orderItemId: serial("order_item_id").primaryKey(),
  ordId: integer("ord_id").references(() => orders.ordId),
  prodId: integer("prod_id").references(() => products.prodId),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

export const deliveries = pgTable("deliveries", {
  delvId: serial("delv_id").primaryKey(),
  ordId: integer("ord_id").references(() => orders.ordId),
  dispatchedDate: timestamp("dispatched_date"),
  expectedDate: timestamp("expected_date"),
  deliveredDate: timestamp("delivered_date"),
  status: deliveryStatusEnum("status").default("pending"),
  address: text("address"),
});

export const inventory = pgTable("inventory", {
  stockId: serial("stock_id").primaryKey(),
  prodId: integer("prod_id").references(() => products.prodId),
  quantity: integer("quantity").notNull().default(0),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  suppId: serial("supp_id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  address: text("address"),
});

export const inquiries = pgTable("inquiries", {
  inquiryId: serial("inquiry_id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  prodId: integer("prod_id").references(() => products.prodId),
  inquiryType: inquiryTypeEnum("inquiry_type").default("general"),
  status: inquiryStatusEnum("status").default("new"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customDesignRequests = pgTable("custom_design_requests", {
  designId: serial("design_id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.customerId),
  furnitureType: varchar("furniture_type", { length: 100 }).notNull(),
  dimensions: text("dimensions"),
  materialPreference: varchar("material_preference", { length: 100 }),
  colorPreference: varchar("color_preference", { length: 100 }),
  specialRequirements: text("special_requirements"),
  referenceImages: json("reference_images").$type<string[]>().default([]),
  budgetRange: varchar("budget_range", { length: 50 }),
  status: designStatusEnum("status").default("submitted"),
  quoteAmount: decimal("quote_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  shoppingCarts: many(shoppingCarts),
  customDesignRequests: many(customDesignRequests),
}));

export const productsRelations = relations(products, ({ many }) => ({
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  inventory: many(inventory),
  inquiries: many(inquiries),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.customerId],
  }),
  orderItems: many(orderItems),
  delivery: one(deliveries),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.ordId],
    references: [orders.ordId],
  }),
  product: one(products, {
    fields: [orderItems.prodId],
    references: [products.prodId],
  }),
}));

export const shoppingCartsRelations = relations(shoppingCarts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [shoppingCarts.customerId],
    references: [customers.customerId],
  }),
  cartItems: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(shoppingCarts, {
    fields: [cartItems.cartId],
    references: [shoppingCarts.cartId],
  }),
  product: one(products, {
    fields: [cartItems.prodId],
    references: [products.prodId],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.ordId],
    references: [orders.ordId],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.prodId],
    references: [products.prodId],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  product: one(products, {
    fields: [inquiries.prodId],
    references: [products.prodId],
  }),
}));

export const customDesignRequestsRelations = relations(customDesignRequests, ({ one }) => ({
  customer: one(customers, {
    fields: [customDesignRequests.customerId],
    references: [customers.customerId],
  }),
}));

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  customerId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  prodId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  adminId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  ordId: true,
  orderDate: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  cartItemId: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  inquiryId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomDesignRequestSchema = createInsertSchema(customDesignRequests).omit({
  designId: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type CustomDesignRequest = typeof customDesignRequests.$inferSelect;
export type InsertCustomDesignRequest = z.infer<typeof insertCustomDesignRequestSchema>;

export type ShoppingCart = typeof shoppingCarts.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;

// Keep existing user schema for compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
