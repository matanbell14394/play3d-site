import prisma from "@/lib/prisma/prisma";
import { UserEntity } from "../types";

class UserRepository {
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      passwordHash: user.password,
      role: user.role as UserEntity["role"],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userRepository = new UserRepository();
