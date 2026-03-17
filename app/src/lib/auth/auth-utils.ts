import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { UserRole } from "@/types";

export async function requireRole(requiredRole: UserRole) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: UserRole } | undefined;

  if (!user || user.role !== requiredRole) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function requireAdmin() {
    return requireRole(UserRole.ADMIN);
}
