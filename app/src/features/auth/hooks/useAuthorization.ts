"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@/types";

export function useAuthorization() {
  const { data: session } = useSession();
  const user = session?.user as { role?: UserRole } | undefined;

  const checkPermission = (allowedRoles: UserRole[]): boolean => {
    if (!user?.role) {
      return false;
    }
    return allowedRoles.includes(user.role);
  };

  return {
    user,
    checkPermission,
    isAdmin: user?.role === UserRole.ADMIN,
    isOperator: user?.role === UserRole.OPERATOR,
  };
}
