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
          .withIndex("by_session", (q) =>
            q.eq("sessionId", session._id)
          )
          .collect();

        const additionalAmount = additionalOrders.reduce(
          (s, o) => s + o.totalPrice,
          0
        );

        const duration = Math.ceil(
          (Date.now() - session.startTime) / 60000
        );

        const gameAmount = Math.ceil(
          (duration / 60) * session.hourlyRate
        );

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
   SESSIYA BOSHLASH
================================ */
export const startSession = mutation({
  args: {
    tableId: v.id("tables"),
    customerId: v.id("customers"),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return { success: false, message: "Login qiling" };

    const table = await ctx.db.get(args.tableId);
    if (!table || table.accountId !== userId)
      return { success: false, message: "Stol topilmadi" };

    const customer = await ctx.db.get(args.customerId);
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
      return {
        success: false,
        message: "Bu stolda faol sessiya bor",
      };

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

/* ===============================
   SESSIYANI YAKUNLASH
================================ */
export const completeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    paidAmount: v.number(),
    paymentType: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("debt")
    ),
    cashbackAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return { success: false, message: "Login qiling" };

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.accountId !== userId)
      return { success: false, message: "Sessiya topilmadi" };

    if (session.status !== "active")
      return {
        success: false,
        message: "Sessiya allaqachon yopilgan",
      };

    const endTime = Date.now();
    const duration = Math.ceil(
      (endTime - session.startTime) / 60000
    );

    const gameAmount = Math.ceil(
      (duration / 60) * session.hourlyRate
    );

    const additionalOrders = await ctx.db
      .query("additionalOrders")
      .withIndex("by_session", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .collect();

    const additionalAmount = additionalOrders.reduce(
      (s, o) => s + o.totalPrice,
      0
    );

    const totalAmount = gameAmount + additionalAmount;
    const cashbackUsed = args.cashbackAmount ?? 0;

    if (cashbackUsed > totalAmount)
      return {
        success: false,
        message: "Cashback summasi noto‘g‘ri",
      };

    if (cashbackUsed > 0 && session.customerId) {
      await ctx.runMutation(api.cashbacks.useCashback, {
        sessionId: args.sessionId,
        amount: cashbackUsed,
      });
    }

    const payableAmount = totalAmount - cashbackUsed;
    const debtAmount = Math.max(
      0,
      payableAmount - args.paidAmount
    );

    await ctx.db.patch(args.sessionId, {
      endTime,
      duration,
      gameAmount,
      additionalAmount,
      totalAmount,
      cashbackUsed,
      paidAmount: args.paidAmount,
      debtAmount,
      status: "completed",
      completedBy: userId,
      notes: args.notes,
    });

    if (args.paidAmount > 0 && args.paymentType !== "debt") {
      await ctx.db.insert("payments", {
        accountId: userId,
        sessionId: args.sessionId,
        customerId: session.customerId,
        amount: args.paidAmount,
        paymentType: args.paymentType,
        createdAt: Date.now(),
      });
    }

    if (session.customerId && debtAmount > 0) {
      const customer = await ctx.db.get(session.customerId);
      if (customer) {
        await ctx.db.patch(session.customerId, {
          totalDebt: customer.totalDebt + debtAmount,
        });
      }
    }

    await ctx.runMutation(api.cashbacks.earnFromSession, {
      sessionId: args.sessionId,
    });

    return {
      success: true,
      totalAmount,
      cashbackUsed,
      payableAmount,
      paidAmount: args.paidAmount,
      debtAmount,
    };
  },
});

/* ===============================
   SESSIYA TARIXI
================================ */
export const getSessionHistory = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return { sessions: [], total: 0, hasMore: false };

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_status", (q) =>
        q.eq("accountId", userId).eq("status", "completed")
      )
      .order("desc")
      .collect();

    const page = sessions.slice(offset, offset + limit);

    const data = await Promise.all(
      page.map(async (s) => ({
        ...s,
        table: await ctx.db.get(s.tableId),
        customer: s.customerId
          ? await ctx.db.get(s.customerId)
          : null,
      }))
    );

    return {
      sessions: data,
      total: sessions.length,
      hasMore: offset + limit < sessions.length,
    };
  },
});
