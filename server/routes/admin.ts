import { Router } from "express";
import { db } from "../db";
import { admins, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { authenticateToken as auth, requireAdmin, AuthRequest } from "../middleware/auth";
import { z } from "zod";

const router = Router();
// Ensure all admin routes are authenticated so req.user is populated
router.use(auth);

const adminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Get all admins
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminList = await db.select({
      adminId: admins.adminId,
      name: admins.name,
      email: admins.email,
      phone: admins.phone,
      address: admins.address,
    }).from(admins);
    
    res.json(adminList);
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ message: "Failed to fetch administrators" });
  }
});

// Add new admin
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, email, password, phone, address } = adminSchema.parse(req.body);

    // Check if admin already exists
    const existingAdmin = await db.query.admins.findFirst({
      where: eq(admins.email, email),
    });

    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin record
    const [newAdmin] = await db.insert(admins)
      .values({
        name,
        email,
        passwordHash,
        phone,
        address,
      })
      .returning();

    // Create corresponding user record with admin role
    await db.insert(users)
      .values({
        name,
        email,
        passwordHash,
        role: 'admin',
        phone,
        address,
        adminId: newAdmin.adminId,
      });

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        adminId: newAdmin.adminId,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        address: newAdmin.address,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input data", errors: error.errors });
    }
    res.status(500).json({ message: "Failed to create administrator" });
  }
});

// Remove admin
router.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = parseInt(req.params.id);
    
    // Don't allow removing yourself
    if (req.user?.id === adminId) {
      return res.status(400).json({ message: "Cannot remove your own admin account" });
    }

    // Remove user record first due to foreign key constraint
    await db.delete(users)
      .where(eq(users.adminId, adminId));

    // Then remove admin record
    const [removedAdmin] = await db.delete(admins)
      .where(eq(admins.adminId, adminId))
      .returning();

    if (!removedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ message: "Admin removed successfully" });
  } catch (error) {
    console.error("Error removing admin:", error);
    res.status(500).json({ message: "Failed to remove administrator" });
  }
});

export default router;
