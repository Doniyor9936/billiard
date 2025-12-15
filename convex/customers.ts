import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Barcha mijozlarni olish
export const getAllCustomers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    return await ctx.db
      .query("customers")
      .withIndex("by_account", (q) => q.eq("accountId", userId))
      .order("desc")
      .collect();
  },
});

// Yangi mijoz qo'shish
export const createCustomer = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    return await ctx.db.insert("customers", {
      accountId: userId,
      name: args.name,
      phone: args.phone,
      totalDebt: 0,
      createdAt: Date.now(),
    });
  },
});

// Mijoz qarzini to'lash
export const payCustomerDebt = mutation({
  args: {
    customerId: v.id("customers"),
    amount: v.number(),
    paymentType: v.union(v.literal("cash"), v.literal("card")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Mijoz topilmadi");
    }

    if (customer.accountId !== userId) {
      throw new Error("Mijoz boshqa akkauntga tegishli");
    }

    if (args.amount > customer.totalDebt) {
      throw new Error("To'lov summasi qarz summasidan ko'p");
    }

    // Mijoz qarzini kamaytirish
    await ctx.db.patch(args.customerId, {
      totalDebt: customer.totalDebt - args.amount,
    });

    // To'lovni qayd qilish
    await ctx.db.insert("payments", {
      accountId: userId,
      customerId: args.customerId,
      amount: args.amount,
      paymentType: "debt_payment",
      description: `${customer.name} qarz to'lovi`,
      createdBy: userId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
