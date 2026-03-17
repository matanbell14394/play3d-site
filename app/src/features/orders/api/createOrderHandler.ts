import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "../validators/orderValidators";
import { orderService } from "../services/orderService";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { ApiResponse, BaseUser } from "@/types";

export async function handleCreateOrder(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated." } }, { status: 401 });
    }

    const json = await req.json();
    const validatedData = createOrderSchema.safeParse(json);

    if (!validatedData.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: validatedData.error.flatten().fieldErrors.toString() },
      }, { status: 400 });
    }

    // The user type from the session needs to be cast to the BaseUser type
    const user = session.user as BaseUser;
    
    const newOrder = await orderService.createOrder(user, validatedData.data);

    return NextResponse.json({ success: true, data: newOrder }, { status: 201 });

  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." } }, { status: 500 });
  }
}
