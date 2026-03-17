import { handleCreateOrder } from "@/features/orders/api/createOrderHandler";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  return handleCreateOrder(req);
}
