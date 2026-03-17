import { BaseRepository } from "@/repositories/baseRepository";

// A placeholder for the Order entity type
export interface OrderEntity {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

class OrderRepository extends BaseRepository<OrderEntity> {
  constructor() {
    super("Order");
  }
}

export const orderRepository = new OrderRepository();
