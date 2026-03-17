import { inventoryRepository } from "../repositories/inventoryRepository";
import { BaseUser } from "@/types";
import { authService } from "@/features/auth/services/authService";

class InventoryService {
  async getInventory(user: BaseUser) {
    const hasPermission = await authService.hasPermission(user, "VIEW_INVENTORY");
    if (!hasPermission) {
      throw new Error("User does not have permission to view inventory.");
    }
    return inventoryRepository.findMany();
  }

  async addInventoryItem(user: BaseUser, item: any) {
    const hasPermission = await authService.hasPermission(user, "MANAGE_INVENTORY");
    if (!hasPermission) {
      throw new Error("User does not have permission to manage inventory.");
    }
    return inventoryRepository.create(item);
  }
}

export const inventoryService = new InventoryService();
