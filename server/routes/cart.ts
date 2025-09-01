import { Router } from "express";
import { db } from "../db";
import { 
  users, products, carts, cartItems,
  inventory,
  type Cart, type CartItem
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { authenticateToken as auth, type AuthRequest } from "../middleware/auth";
import { BadRequestError, NotFoundError } from "../middleware/error";

const router = Router();

// Schema validation
const cartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1),
  customNotes: z.string().optional(),
});

const updateCartItemSchema = z.object({
  quantity: z.number().min(1),
  customNotes: z.string().optional(),
});

// Get cart items with product details
router.get("/", auth, async (req: AuthRequest, res) => {
  try {
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, req.user!.id),
      with: {
        items: {
          with: {
            product: {
              with: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    // If no cart, return empty array for consistent response
    if (!cart) {
      return res.json([]);
    }

    res.json(cart.items);
  } catch (error) {
    console.error("Error fetching cart:", error);
    throw error; // Let error middleware handle it
  }
});

// Add item to cart with stock validation
router.post("/", auth, async (req: AuthRequest, res) => {
  try {
    const input = cartItemSchema.parse(req.body);

    // Check product exists and is in stock
    const product = await db.query.products.findFirst({
      where: eq(products.prodId, input.productId),
      with: {
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    // Validate stock
    if (!product.inventory?.[0] || product.inventory[0].quantity < input.quantity) {
      throw new BadRequestError("Not enough stock available");
    }

    // Get or create cart atomically
    let cart: Cart | undefined;
    await db.transaction(async (tx) => {
      cart = await tx.query.carts.findFirst({
        where: eq(carts.userId, req.user!.id),
      });

      if (!cart) {
        const [newCart] = await tx
          .insert(carts)
          .values({ userId: req.user!.id })
          .returning();
        cart = newCart;
      }
    });

    if (!cart) {
      throw new Error("Failed to get or create cart");
    }

    // Check existing item in cart
    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.productId, input.productId)
      ),
    });

    // Update or insert cart item atomically with stock check
    await db.transaction(async (tx) => {
      // Lock inventory for update
      const [currentInventory] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, input.productId))
        .execute();

      if (!currentInventory || currentInventory.quantity < input.quantity) {
        throw new BadRequestError("Stock was depleted while adding to cart");
      }

      if (existingItem) {
        const totalQuantity = existingItem.quantity + input.quantity;
        if (currentInventory.quantity < totalQuantity) {
          throw new BadRequestError("Not enough stock available for total quantity");
        }

        await tx
          .update(cartItems)
          .set({
            quantity: totalQuantity,
            customNotes: input.customNotes,
          })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        await tx
          .insert(cartItems)
          .values({
            cartId: cart.id,
            productId: input.productId,
            quantity: input.quantity,
            customNotes: input.customNotes,
          });
      }
    });

    // Get updated cart
    const updatedCart = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      with: {
        product: {
          with: {
            inventory: true,
          },
        },
      },
    });

    res.json(updatedCart);
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw error; // Let error middleware handle it
  }
});

// Update cart item quantity
router.put("/item/:id", auth, async (req: AuthRequest, res) => {
  try {
    const input = updateCartItemSchema.parse(req.body);
    const itemId = parseInt(req.params.id);

    // Get user's cart
    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, req.user!.id),
    });

    if (!cart) {
      throw new NotFoundError("Cart not found");
    }

    // Get item with product info
    const cartItem = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)),
      with: {
        product: {
          with: {
            inventory: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundError("Cart item not found");
    }

    // Update atomically with stock check
    await db.transaction(async (tx) => {
      // Lock inventory for update
      const [currentInventory] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.productId, cartItem.productId))
        .execute();

      if (!currentInventory || currentInventory.quantity < input.quantity) {
        throw new BadRequestError("Not enough stock available");
      }

      // Update cart item
      await tx
        .update(cartItems)
        .set({
          quantity: input.quantity,
          customNotes: input.customNotes,
        })
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
    });

    // Get updated cart
    const updatedCart = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      with: {
        product: {
          with: {
            inventory: true,
          },
        },
      },
    });

    res.json(updatedCart);
  } catch (error) {
    console.error("Error updating cart item:", error);
    throw error; // Let error middleware handle it
  }
});

// Remove item from cart
router.delete("/item/:id", auth, async (req: AuthRequest, res) => {
  try {
    const itemId = parseInt(req.params.id);

    const cart = await db.query.carts.findFirst({
      where: eq(carts.userId, req.user!.id),
    });

    if (!cart) {
      throw new NotFoundError("Cart not found");
    }

    // Delete atomically
    await db.transaction(async (tx) => {
      // Verify item exists and belongs to user's cart
      const item = await tx.query.cartItems.findFirst({
        where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)),
      });

      if (!item) {
        throw new NotFoundError("Cart item not found");
      }

      await tx
        .delete(cartItems)
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id)));
    });

    // Get updated cart
    const updatedCart = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      with: {
        product: {
          with: {
            inventory: true,
          },
        },
      },
    });

    res.json(updatedCart);
  } catch (error) {
    console.error("Error removing cart item:", error);
    throw error; // Let error middleware handle it
  }
});

export default router;
