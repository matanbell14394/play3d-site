import { BaseUser, UserRole } from "@/types";

// The full User entity, including the password for repository use.
// This should never be exposed to the client.
export interface UserEntity extends BaseUser {
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
