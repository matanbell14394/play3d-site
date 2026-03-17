"use server";

import prisma from "@/lib/prisma/prisma";
import { revalidatePath } from "next/cache";
import { InventoryType } from "@prisma/client";

export async function getInventoryItems() {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: items };
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return { success: false, error: "Failed to fetch inventory" };
  }
}

export async function addInventoryItem(formData: {
  name: string;
  type: InventoryType;
  quantity: number;
  unit: string;
  price: number;
}) {
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        name: formData.name,
        type: formData.type,
        quantity: formData.quantity,
        unit: formData.unit,
        price: formData.price,
      },
    });

    revalidatePath("/admin/inventory");
    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to add inventory item:", error);
    return { success: false, error: "Failed to add inventory item" };
  }
}

export async function deleteInventoryItem(id: string) {
  try {
    await prisma.inventoryItem.delete({
      where: { id },
    });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete inventory item:", error);
    return { success: false, error: "Failed to delete inventory item" };
  }
}
