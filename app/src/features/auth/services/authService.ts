import { userRepository } from "../repositories/userRepository";
import { UserEntity } from "../types";
import { compare } from "bcryptjs";
import { BaseUser, UserRole } from "@/types";

// Placeholder for a more complex permission check
type Permission = string;

class AuthService {
  /**
   * Validates user credentials and returns the user if successful.
   * @param email The user's email.
   * @param password The user's plain-text password.
   * @returns A partial user object without the password hash, or null.
   */
  async login(email: string, password: string): Promise<Omit<UserEntity, 'passwordHash'> | null> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      console.log(`Login attempt failed: User ${email} not found.`);
      return null;
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      console.log(`Login attempt failed: Invalid password for user ${email}.`);
      return null;
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Checks if a user has the required permission.
   * This is a placeholder for a full-fledged RBAC check.
   * @param user The user to check.
   * @param requiredPermission The permission required for the action.
   * @returns True if the user has permission, false otherwise.
   */
  async hasPermission(user: BaseUser, requiredPermission: Permission): Promise<boolean> {
    // This should be a sophisticated check against the Role and Permission models.
    // For now, we'll implement a simple rule: ADMIN has all permissions.
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Example of a more specific rule
    if (user.role === UserRole.OPERATOR && requiredPermission.startsWith("VIEW_")) {
        return true;
    }

    console.warn(`Permission check not fully implemented. User: ${user.email}, Permission: ${requiredPermission}`);
    return false; // Default to deny
  }

  // Placeholder for user registration
  async register(data: any) {
    // 1. Validate input
    // 2. Check if user exists
    // 3. Hash password
    // 4. Create user via repository
    // 5. Return user
    throw new Error("Not implemented");
  }
}

export const authService = new AuthService();
