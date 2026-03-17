import { BaseRepository } from "@/repositories/baseRepository";

// A placeholder for the InventoryItem entity type
export interface InventoryItemEntity {
  id: string;
  name: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

class InventoryRepository extends BaseRepository<InventoryItemEntity> {
  constructor() {
    super("InventoryItem");
  }
}

export const inventoryRepository = new InventoryRepository();
