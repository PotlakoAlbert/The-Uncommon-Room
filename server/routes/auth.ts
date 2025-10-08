import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateTokens } from "../middleware/auth";
import { z } from "zod";
import { CookieOptions } from "express";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", async (req, res) => {
  try {
    console.log('[Auth] Registration attempt with data:', {
      ...req.body,
      password: req.body.password ? '[REDACTED]' : undefined
    });
    
    const { name, email, password, phone, address } = registerSchema.parse(req.body);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        phone,
        address,
        role: 'user' as const,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

// Generate tokens for the user
const { token: accessToken, token: refreshToken } = await generateTokens(user);

    await db
      .update(users)
      .set({ refreshToken })
      .where(eq(users.id, user.id));

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    console.error('[Auth] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Auth] Error name:', error instanceof Error ? error.name : 'Unknown error type');
    console.error('[Auth] Error message:', error instanceof Error ? error.message : String(error));
    
    if (error instanceof z.ZodError) {
      console.error('[Auth] Validation errors:', error.errors);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    // Check for specific database or JWT errors
    if (error instanceof Error) {
      if (error.message.includes('JWT_SECRET')) {
        console.error('[Auth] JWT configuration error');
        return res.status(500).json({ message: "Server configuration error" });
      }
      if (error.message.includes('database') || error.message.includes('connection')) {
        console.error('[Auth] Database connection error');
        return res.status(500).json({ message: "Database connection error" });
      }
    }
    
    res.status(500).json({ message: "Registration failed", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const { token: accessToken, token: refreshToken } = await generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await db
      .update(users)
      .set({ refreshToken })
      .where(eq(users.id, user.id));

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    console.error('[Auth] Login error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof z.ZodError) {
      console.error('[Auth] Login validation errors:', error.errors);
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    
    // Check for specific errors
    if (error instanceof Error) {
      if (error.message.includes('JWT_SECRET')) {
        console.error('[Auth] JWT configuration error in login');
        return res.status(500).json({ message: "Server configuration error" });
      }
      if (error.message.includes('database') || error.message.includes('connection')) {
        console.error('[Auth] Database connection error in login');
        return res.status(500).json({ message: "Database connection error" });
      }
    }
    
    res.status(500).json({ message: "Login failed", error: error instanceof Error ? error.message : "Unknown error" });
  }
});

router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as jwt.JwtPayload;

    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.id),
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await db
      .update(users)
      .set({ refreshToken: tokens.token })
      .where(eq(users.id, user.id));

    res.cookie("refreshToken", tokens.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: tokens.token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as jwt.JwtPayload;
      await db
        .update(users)
        .set({ refreshToken: null })
        .where(eq(users.id, decoded.id));
    } catch (error) {
      // Ignore token verification errors during logout
    }
  }

  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});

export default router;
