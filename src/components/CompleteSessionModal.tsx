import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface CompleteSessionModalProps {
  sessionId: Id<"sessions">;
  onClose: () => void;
}

export function CompleteSessionModal({ sessionId, onClose }: CompleteSessionModalProps) {
  const activeSessions = useQuery(api.sessions.getActiveSessions);
  const completeSession = useMutation(api.sessions.completeSession);

  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "debt">("cash");
  const [notes, setNotes] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const session = activeSessions?.find(s => s._id === sessionId);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (paidAmount < 0) {
      toast.error("To'lov summasi manfiy bo'lishi mumkin emas");
      return;
    }

    if (paidAmount > session.currentTotalAmount) {
      toast.error("To'lov summasi umumiy summadan ko'p bo'lishi mumkin emas");
      return;
    }

    try {
      setIsCompleting(true);
      const result = await completeSession({
        sessionId,
        paidAmount,
        paymentType,
        notes: notes.trim() || undefined,
      });

      toast.success("Sessiya muvaffaqiyatli yakunlandi!");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xatolik yuz berdi");
    } finally {
      setIsCompleting(false);
    }
  };

  if (!session) {
    return null;
  }

  const debtAmount = Math.max(0, session.currentTotalAmount - paidAmount);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">O'yinni Tugatish</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Sessiya ma'lumotlari */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-3">{session.table?.name}</h3>
          
          <div className="space-y-2 text-sm">
            {session.customer && (
              <div className="flex justify-between">
                <span className="text-gray-600">Mijoz:</span>
                <span>{session.customer.name}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Davomiyligi:</span>
              <span>{Math.floor(session.currentDuration / 60)}s {session.currentDuration % 60}d</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">O'yin summasi:</span>
              <span>{session.currentGameAmount.toLocaleString()} so'm</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Qo'shimcha:</span>
              <span>{session.currentAdditionalAmount.toLocaleString()} so'm</span>
            </div>
            
            <div className="flex justify-between font-medium text-lg border-t pt-2">
              <span>Jami:</span>
              <span className="text-blue-600">{session.currentTotalAmount.toLocaleString()} so'm</span>
            </div>
          </div>
        </div>

        {/* To'lov ma'lumotlari */}
        <form onSubmit={handleComplete}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To'lov summasi (so'm)
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                max={session.currentTotalAmount}
              />
              <div className="mt-1 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPaidAmount(session.currentTotalAmount)}
                  className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded"
                >
                  To'liq to'lash
                </button>
                <button
                  type="button"
                  onClick={() => setPaidAmount(0)}
                  className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded"
                >
                  Qarzga yozish
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To'lov turi
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as "cash" | "card" | "debt")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={paidAmount === 0}
              >
                <option value="cash">Naqd</option>
                <option value="card">Karta</option>
                <option value="debt">Qarz</option>
              </select>
            </div>

            {debtAmount > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="text-sm text-yellow-800">
                  <strong>Qarz summasi:</strong> {debtAmount.toLocaleString()} so'm
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Izoh (ixtiyoriy)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Qo'shimcha izohlar..."
              />
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isCompleting}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isCompleting ? "Tugallanmoqda..." : "O'yinni Tugatish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
