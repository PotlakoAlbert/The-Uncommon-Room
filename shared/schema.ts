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

// Role enum for users
export const roleEnum = pgEnum("role", ["user", "admin"]);

// Tables
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: roleEnum("role").default("user").notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  refreshToken: text("refresh_token"),
  adminId: integer("admin_id").references(() => admins.adminId),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
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

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").references(() => carts.id),
  productId: integer("product_id").references(() => products.prodId),
  quantity: integer("quantity").notNull().default(1),
  customNotes: text("custom_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
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
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.prodId),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  dispatchedDate: timestamp("dispatched_date"),
  expectedDate: timestamp("expected_date"),
  deliveredDate: timestamp("delivered_date"),
  status: deliveryStatusEnum("status").default("pending"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.prodId),
  quantity: integer("quantity").notNull().default(0),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  productId: integer("product_id").references(() => products.prodId),
  inquiryType: inquiryTypeEnum("inquiry_type").default("general"),
  status: inquiryStatusEnum("status").default("new"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customDesignRequests = pgTable("custom_design_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  furnitureType: varchar("furniture_type", { length: 100 }).notNull(),
  dimensions: text("dimensions"),
  materialPreference: varchar("material_preference", { length: 100 }),
  colorPreference: varchar("color_preference", { length: 100 }),
  specialRequirements: text("special_requirements"),
  referenceImages: json("reference_images").$type<string[]>().default([]),
  // New: Additional links (Pinterest/Instagram/product pages). Stored separately from images.
  referenceLinks: json("reference_links").$type<string[]>().default([]),
  budgetRange: varchar("budget_range", { length: 50 }),
  status: designStatusEnum("status").default("submitted"),
  quoteAmount: decimal("quote_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations


export const productsRelations = relations(products, ({ many }) => ({
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  inventory: many(inventory),
  inquiries: many(inquiries),
}));

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  carts: many(carts),
  customDesignRequests: many(customDesignRequests),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  delivery: one(deliveries),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.prodId],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.prodId],
  }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.prodId],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  product: one(products, {
    fields: [inquiries.productId],
    references: [products.prodId],
  }),
}));

export const customDesignRequestsRelations = relations(customDesignRequests, ({ one }) => ({
  user: one(users, {
    fields: [customDesignRequests.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  refreshToken: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  prodId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomDesignRequestSchema = createInsertSchema(customDesignRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type Cart = typeof carts.$inferSelect;

export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;

export type CustomDesignRequest = typeof customDesignRequests.$inferSelect;
export type InsertCustomDesignRequest = z.infer<typeof insertCustomDesignRequestSchema>;

export type Delivery = typeof deliveries.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;


