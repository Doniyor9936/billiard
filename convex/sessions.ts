import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

/* ===============================
   FAOL SESSIYALAR
================================ */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_status", (q) =>
        q.eq("accountId", userId).eq("status", "active")
      )
      .collect();

    return Promise.all(
      sessions.map(async (session) => {
        const table = await ctx.db.get(session.tableId);
        const customer = session.customerId
          ? await ctx.db.get(session.customerId)
          : null;

        const additionalOrders = await ctx.db
          .query("additionalOrders")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();

        const additionalAmount = additionalOrders.reduce(
          (s, o) => s + o.totalPrice,
          0
        );

        const duration = Math.ceil((Date.now() - session.startTime) / 60000);
        const gameAmount = Math.ceil((duration / 60) * session.hourlyRate);

        return {
          ...session,
          table,
          customer,
          duration,
          gameAmount,
          additionalAmount,
          totalAmount: gameAmount + additionalAmount,
        };
      })
    );
  },
});

/* ===============================
   SESSIYANI BOSHLASH
================================ */
export const startSession = mutation({
  args: {
    tableId: v.id("tables"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, message: "Login qiling" };

    const table = await ctx.db.get(args.tableId);
    const customer = await ctx.db.get(args.customerId);
    if (!table || table.accountId !== userId)
      return { success: false, message: "Stol topilmadi" };
    if (!customer || customer.accountId !== userId)
      return { success: false, message: "Mijoz topilmadi" };

    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_table", (q) =>
        q.eq("accountId", userId).eq("tableId", args.tableId)
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existing)
      return { success: false, message: "Bu stolda faol sessiya bor" };

    const sessionId = await ctx.db.insert("sessions", {
      accountId: userId,
      tableId: args.tableId,
      customerId: args.customerId,
      startTime: Date.now(),
      hourlyRate: table.hourlyRate,
      status: "active",
    });

    return { success: true, sessionId };
  },
});
