import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// Faol sessiyalarni olish
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_status", (q) =>
        q.eq("accountId", userId).eq("status", "active"),
      )
      .collect();

    const sessionsWithDetails = await Promise.all(
      sessions.map(async (session) => {
        const table = await ctx.db.get(session.tableId);
        const customer = session.customerId ? await ctx.db.get(session.customerId) : null;
        
        // Qo'shimcha buyurtmalarni olish
        const additionalOrders = await ctx.db
          .query("additionalOrders")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();

        const additionalAmount = additionalOrders.reduce((sum, order) => sum + order.totalPrice, 0);

        // Hozirgi vaqt asosida o'yin summasi
        const currentTime = Date.now();
        const durationMinutes = Math.ceil((currentTime - session.startTime) / (1000 * 60));
        const gameAmount = Math.ceil((durationMinutes / 60) * session.hourlyRate);

        return {
          ...session,
          table,
          customer,
          additionalOrders,
          currentDuration: durationMinutes,
          currentGameAmount: gameAmount,
          currentAdditionalAmount: additionalAmount,
          currentTotalAmount: gameAmount + additionalAmount,
        };
      })
    );

    return sessionsWithDetails;
  },
});

// Yangi sessiya boshlash
export const startSession = mutation({
  args: {
    tableId: v.id("tables"),
    customerId: v.id("customers"), // Yangi sessiyalar uchun majburiy
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const table = await ctx.db.get(args.tableId);
    if (!table) {
      throw new Error("Stol topilmadi");
    }

    if (table.accountId !== userId) {
      throw new Error("Bu stolga ruxsatingiz yo'q");
    }

    if (!table.isActive) {
      throw new Error("Stol faol emas");
    }

    // Mijozni tekshirish
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Mijoz topilmadi");
    }

    if (customer.accountId !== userId) {
      throw new Error("Mijoz boshqa akkauntga tegishli");
    }

    // Faol sessiya borligini tekshirish
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_table", (q) =>
        q.eq("accountId", userId).eq("tableId", args.tableId),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingSession) {
      throw new Error("Bu stolda allaqachon faol sessiya mavjud");
    }

    const sessionId = await ctx.db.insert("sessions", {
      accountId: userId,
      tableId: args.tableId,
      customerId: args.customerId,
      startTime: Date.now(),
      hourlyRate: table.hourlyRate,
      status: "active",
    });

    return { sessionId, success: true };
  },
});

// Sessiyani yakunlash
export const completeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    paidAmount: v.number(),
    paymentType: v.union(v.literal("cash"), v.literal("card"), v.literal("debt")),
    notes: v.optional(v.string()),
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

    if (session.accountId !== userId) {
      throw new Error("Sessiya boshqa akkauntga tegishli");
    }

    if (session.status !== "active") {
      throw new Error("Sessiya allaqachon yakunlangan");
    }

    const endTime = Date.now();
    const duration = Math.ceil((endTime - session.startTime) / (1000 * 60)); // daqiqalarda
    const gameAmount = Math.ceil((duration / 60) * session.hourlyRate);

    // Qo'shimcha buyurtmalar summasi
    const additionalOrders = await ctx.db
      .query("additionalOrders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const additionalAmount = additionalOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalAmount = gameAmount + additionalAmount;
    const debtAmount = Math.max(0, totalAmount - args.paidAmount);

    // Sessiyani yangilash
    await ctx.db.patch(args.sessionId, {
      endTime,
      duration,
      gameAmount,
      additionalAmount,
      totalAmount,
      paidAmount: args.paidAmount,
      debtAmount,
      status: "completed",
      completedBy: userId,
      notes: args.notes,
    });

    // To'lovni qayd qilish (agar to'lov bo'lsa)
    if (args.paidAmount > 0 && args.paymentType !== "debt") {
      await ctx.db.insert("payments", {
        accountId: userId,
        sessionId: args.sessionId,
        customerId: session.customerId,
        amount: args.paidAmount,
        paymentType: args.paymentType,
        description: `Sessiya #${args.sessionId} uchun to'lov`,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }

    // Mijoz qarzini yangilash (agar mijoz va qarz bo'lsa)
    if (session.customerId && debtAmount > 0) {
      const customer = await ctx.db.get(session.customerId);
      if (customer) {
        await ctx.db.patch(session.customerId, {
          totalDebt: customer.totalDebt + debtAmount,
        });
      }
    }

    // Sessiya uchun cashback berish (5% bonus) - faqat o'yin summasi asosida
    if (gameAmount > 0) {
      await ctx.runMutation(api.cashbacks.earnFromSession, {
        sessionId: args.sessionId,
      });
    }

    return { success: true, totalAmount, paidAmount: args.paidAmount, debtAmount };
  },
});

// Sessiya tarixini olish
export const getSessionHistory = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_account_and_status", (q) =>
        q.eq("accountId", userId).eq("status", "completed"),
      )
      .order("desc")
      .collect();

    const paginatedSessions = sessions.slice(offset, offset + limit);

    const sessionsWithDetails = await Promise.all(
      paginatedSessions.map(async (session) => {
        const table = await ctx.db.get(session.tableId);
        const customer = session.customerId ? await ctx.db.get(session.customerId) : null;
        const completedBy = session.completedBy ? await ctx.db.get(session.completedBy) : null;

        return {
          ...session,
          table,
          customer,
          completedBy,
        };
      })
    );

    return {
      sessions: sessionsWithDetails,
      total: sessions.length,
      hasMore: offset + limit < sessions.length,
    };
  },
});
