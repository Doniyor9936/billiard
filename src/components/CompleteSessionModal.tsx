import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface CompleteSessionModalProps {
  sessionId: Id<"sessions">;
  onClose: () => void;
}

export function CompleteSessionModal({
  sessionId,
  onClose,
}: CompleteSessionModalProps) {
  const activeSessions = useQuery(api.sessions.getActiveSessions);
  const cashbackSettings = useQuery(api.cashbacks.getSettings);
  const completeSession = useMutation(api.sessions.completeSession);

  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentType, setPaymentType] =
    useState<"cash" | "card" | "debt">("cash");
  const [cashbackAmount, setCashbackAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const session = activeSessions?.find((s) => s._id === sessionId);
  if (!session) return null;

  const customerCashback = session.customer?.cashbackBalance || 0;
  const debtAmount = Math.max(
    0,
    session.currentTotalAmount - (paidAmount + cashbackAmount)
  );

  const handleComplete = async () => {
    if (isCompleting) return;

    if (paidAmount < 0 || cashbackAmount < 0) {
      toast.error("Manfiy summa kiritib bo‘lmaydi");
      return;
    }

    if (paidAmount + cashbackAmount > session.currentTotalAmount) {
      toast.error("To‘lov umumiy summadan oshib ketdi");
      return;
    }

    if (cashbackAmount > customerCashback) {
      toast.error("Cashback balansi yetarli emas");
      return;
    }

    try {
      setIsCompleting(true);

      const res = await completeSession({
        sessionId,
        paidAmount,
        paymentType,
        cashbackAmount: cashbackAmount || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res?.success) {
        toast.error(res?.message || "Xatolik yuz berdi");
        return;
      }

      toast.success("Sessiya muvaffaqiyatli yakunlandi");
      onClose(); // 🔥 faqat modal yopiladi
    } catch {
      toast.error("Server xatosi");
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">O‘yinni tugatish</h2>

        {/* Summalar */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span>Jami:</span>
            <span className="font-semibold">
              {session.currentTotalAmount.toLocaleString()} so‘m
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>- Cashback:</span>
            <span className="text-green-600">
              {cashbackAmount.toLocaleString()} so‘m
            </span>
          </div>
          <div className="flex justify-between">
            <span>- To‘lov:</span>
            <span className="text-blue-600">
              {paidAmount.toLocaleString()} so‘m
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Qarz:</span>
            <span className="text-red-600">
              {debtAmount.toLocaleString()} so‘m
            </span>
          </div>
        </div>

        {/* To‘lov */}
        <input
          type="number"
          className="w-full border p-2 rounded mb-2"
          value={paidAmount}
          onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
          placeholder="To‘lov summasi"
        />

        {/* Cashback */}
        {customerCashback > 0 && (
          <input
            type="number"
            className="w-full border p-2 rounded mb-2"
            value={cashbackAmount}
            onChange={(e) =>
              setCashbackAmount(
                Math.min(
                  customerCashback,
                  Number(e.target.value) || 0
                )
              )
            }
            placeholder="Cashback ishlatish"
          />
        )}

        {/* Tugmalar */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 py-2 rounded"
          >
            Bekor qilish
          </button>

          <button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting}
            className="flex-1 bg-red-600 text-white py-2 rounded disabled:opacity-50"
          >
            {isCompleting ? "Yakunlanmoqda..." : "Tugatish"}
          </button>
        </div>
      </div>
    </div>
  );
}
