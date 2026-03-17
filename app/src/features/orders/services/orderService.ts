import { orderRepository } from "../repositories/orderRepository";
import { OrderStatus, UserRole } from "@/types";
import { authService } from "@/features/auth/services/authService";
import { BaseUser } from "@/types";

import { sliceService } from "./sliceService";

class OrderService {
  async createOrder(user: BaseUser, orderData: any) {
    // Business logic for creating an order
    console.log("Creating order for user:", user.email);
    const order = await orderRepository.create({ ...orderData, userId: user.id, status: OrderStatus.PENDING });

    // If an STL URL is provided, trigger the slicing process
    if (orderData.stlUrl) {
      console.log(`Order ${order.id} has an STL URL, triggering slice process.`);
      // In a real app, this would dispatch a job to a queue.
      // For now, we call the service directly.
      sliceService.processStlUrl(orderData.stlUrl)
        .then(metadata => {
          console.log(`Slicing successful for order ${order.id}.`, metadata);
          // Here, you would update the order and slice job records in the DB.
        })
        .catch(error => {
          console.error(`Slicing failed for order ${order.id}.`, error);
          // Update order status to FAILED or ON_HOLD
        });
    }

    return order;
  }


  async updateOrderStatus(user: BaseUser, orderId: string, status: OrderStatus) {
    // Business logic for updating order status
    // 1. Check permissions
    const hasPermission = await authService.hasPermission(user, "UPDATE_ORDER_STATUS");
    if (!hasPermission) {
      throw new Error("User does not have permission to update order status.");
    }
    
    // 2. Get order
    const order = await orderRepository.findById(orderId);
    if (!order) {
      throw new Error("Order not found.");
    }

    // 3. If status is DELIVERED, trigger automation
    if (status === OrderStatus.DELIVERED) {
      console.log("Order delivered. Triggering automation...");
      // a. Deduct inventory
      // b. Create income transaction
      // c. Mark as processed
    }
    
    // 4. Update order status
    return await orderRepository.update(orderId, { status });
  }
}

export const orderService = new OrderService();
