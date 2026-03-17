// This file contains shared types used across the application.
// As the project grows, this can be split into multiple files.

// --------------------------------------
// API & Data Types
// --------------------------------------

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
}

// --------------------------------------
// Domain Enums & Types
// (Manually defined for now, will be replaced by Prisma-generated types)
// --------------------------------------

export enum UserRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  CLIENT = "CLIENT",
}

export enum OrderStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  PRINTING = "PRINTING",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  ON_HOLD = "ON_HOLD",
  FAILED = "FAILED",
}

// A base user type. This will be expanded upon in feature-specific types.
export interface BaseUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

// --------------------------------------
// Utility Types
// --------------------------------------

/**
 * Makes specified keys of an object optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specified keys of an object required.
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
