import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { DrizzleError } from "drizzle-orm";

export interface ApiError extends Error {
  statusCode?: number;
  errors?: any[];
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.errors,
    });
  }

  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(403).json({
      message: "Invalid token",
    });
  }

  if (error instanceof DrizzleError) {
    if ('code' in error && error.code === "23505") { // Unique violation
      return res.status(409).json({
        message: "Resource already exists",
      });
    }
    return res.status(500).json({
      message: "Database error",
    });
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  res.status(statusCode).json({
    message,
    errors: error.errors,
  });
};

export class BadRequestError extends Error {
  statusCode = 400;
  errors: any[] | undefined;
  constructor(message: string, errors?: any[]) {
    super(message);
    this.errors = errors;
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = "Unauthorized") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "Forbidden") {
    super(message);
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
  }
}
