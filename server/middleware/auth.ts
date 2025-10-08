import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, admins } from "@shared/schema";
import { eq, or } from "drizzle-orm";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const generateTokens = (user: { id: number; email: string; role: string }) => {
  // Set fallback JWT secret if not provided
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'ad03d779b2e16a187f4a65e2caf2084d89af004c199e6d4624ed9e5babbf8d52138932fc44df7ac6e567055bae52046a7dca26450e78e8ce48e2c43a3043368b';
    console.log('⚠️  JWT_SECRET not found in generateTokens, using fallback');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token };
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'ad03d779b2e16a187f4a65e2caf2084d89af004c199e6d4624ed9e5babbf8d52138932fc44df7ac6e567055bae52046a7dca26450e78e8ce48e2c43a3043368b';
      console.log('⚠️  JWT_SECRET not found in authenticateToken, using fallback');
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as jwt.JwtPayload & {
      id: number;
      email: string;
      role: string;
    };

    // Check if it's an admin token (adminId in JWT) or user token (id in JWT)
    let user = null;
    let role = decoded.role;

    if (decoded.role === 'admin') {
      // For admin tokens, check the admins table
      const admin = await db.query.admins.findFirst({
        where: eq(admins.adminId, decoded.id)
      });
      
      if (admin) {
        // Also check if there's a corresponding user record
        const userRecord = await db.query.users.findFirst({
          where: eq(users.adminId, admin.adminId)
        });
        
        user = {
          id: userRecord?.id || admin.adminId, // Use user ID if exists, otherwise admin ID
          email: admin.email,
          role: 'admin'
        };
      }
    } else {
      // For regular user tokens, check the users table
      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, decoded.id)
      });
      
      if (userRecord) {
        user = {
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role
        };
      }
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ message: "Invalid token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
