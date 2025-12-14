import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Sessiya uchun qo'shimcha buyurtmalarni olish
export const getOrdersBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    return await ctx.db
      .query("additionalOrders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Qo'shimcha buyurtma qo'shish
export const addOrder = mutation({
  args: {
    sessionId: v.id("sessions"),
    itemName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Sessiya topilmadi");
    }

    if (session.status !== "active") {
      throw new Error("Faqat faol sessiyalarga buyurtma qo'shish mumkin");
    }

    const totalPrice = args.quantity * args.unitPrice;

    return await ctx.db.insert("additionalOrders", {
      sessionId: args.sessionId,
      itemName: args.itemName,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      totalPrice,
      createdAt: Date.now(),
    });
  },
});

// Buyurtmani o'chirish
export const removeOrder = mutation({
  args: {
    orderId: v.id("additionalOrders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Buyurtma topilmadi");
    }

    const session = await ctx.db.get(order.sessionId);
    if (!session) {
      throw new Error("Sessiya topilmadi");
    }

    if (session.status !== "active") {
      throw new Error("Faqat faol sessiyalardagi buyurtmalarni o'chirish mumkin");
    }

    await ctx.db.delete(args.orderId);
    return { success: true };
  },
});
