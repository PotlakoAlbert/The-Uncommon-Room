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
    console.error(error);
    res.status(400).json({ message: "Invalid input" });
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
    console.error(error);
    res.status(400).json({ message: "Invalid input" });
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
