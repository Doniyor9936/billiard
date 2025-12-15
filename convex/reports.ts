import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Kunlik hisobot
export const getDailyReport = query({
  args: {
    date: v.string(), // YYYY-MM-DD formatida
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    const startOfDay = new Date(args.date + "T00:00:00").getTime();
    const endOfDay = new Date(args.date + "T23:59:59").getTime();

    // Kun davomida yakunlangan sessiyalar
    const completedSessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .filter((q) => 
        q.and(
          q.gte(q.field("endTime"), startOfDay),
          q.lte(q.field("endTime"), endOfDay)
        )
      )
      .collect();

    // Kun davomidagi to'lovlar
    const payments = await ctx.db
      .query("payments")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), startOfDay),
          q.lte(q.field("createdAt"), endOfDay)
        )
      )
      .collect();

    // Hisobotni hisoblash
    const totalSessions = completedSessions.length;
    const totalRevenue = completedSessions.reduce((sum, session) => sum + (session.totalAmount || 0), 0);
    const totalPaid = completedSessions.reduce((sum, session) => sum + (session.paidAmount || 0), 0);
    const totalDebt = completedSessions.reduce((sum, session) => sum + (session.debtAmount || 0), 0);
    const totalGameRevenue = completedSessions.reduce((sum, session) => sum + (session.gameAmount || 0), 0);
    const totalAdditionalRevenue = completedSessions.reduce((sum, session) => sum + (session.additionalAmount || 0), 0);

    const cashPayments = payments.filter(p => p.paymentType === "cash").reduce((sum, p) => sum + p.amount, 0);
    const cardPayments = payments.filter(p => p.paymentType === "card").reduce((sum, p) => sum + p.amount, 0);
    const debtPayments = payments.filter(p => p.paymentType === "debt_payment").reduce((sum, p) => sum + p.amount, 0);

    return {
      date: args.date,
      totalSessions,
      totalRevenue,
      totalPaid,
      totalDebt,
      totalGameRevenue,
      totalAdditionalRevenue,
      payments: {
        cash: cashPayments,
        card: cardPayments,
        debtPayments,
        total: cashPayments + cardPayments + debtPayments,
      },
      sessions: completedSessions,
    };
  },
});

// Umumiy statistika
export const getOverallStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Tizimga kirish talab qilinadi");
    }

    // Faol sessiyalar soni
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Umumiy qarzlar
    const customers = await ctx.db.query("customers").collect();
    const totalDebt = customers.reduce((sum, customer) => sum + customer.totalDebt, 0);

    // Bugungi tushum
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today + "T00:00:00").getTime();
    const endOfDay = new Date(today + "T23:59:59").getTime();

    const todayPayments = await ctx.db
      .query("payments")
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), startOfDay),
          q.lte(q.field("createdAt"), endOfDay)
        )
      )
      .collect();

    const todayRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      activeSessionsCount: activeSessions.length,
      totalCustomers: customers.length,
      totalDebt,
      todayRevenue,
      customersWithDebt: customers.filter(c => c.totalDebt > 0).length,
    };
  },
});
