import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { AdditionalOrdersModal } from "./AdditionalOrdersModal";
import { CompleteSessionModal } from "./CompleteSessionModal";

export function SessionsView() {
  const activeSessions = useQuery(api.sessions.getActiveSessions);
  const [selectedSession, setSelectedSession] = useState<Id<"sessions"> | null>(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("uz-UZ");
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}s ${remainingMinutes}d`;
    }
    return `${remainingMinutes}d`;
  };

  const handleAddOrders = (sessionId: Id<"sessions">) => {
    setSelectedSession(sessionId);
    setShowOrdersModal(true);
  };

  const handleCompleteSession = (sessionId: Id<"sessions">) => {
    setSelectedSession(sessionId);
    setShowCompleteModal(true);
  };

  if (!activeSessions) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Faol Sessiyalar</h1>
        <div className="text-sm text-gray-600">
          Jami faol sessiyalar: {activeSessions.length}
        </div>
      </div>

      {activeSessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-500 text-lg">Hozirda faol sessiyalar yo'q</div>
          <div className="text-gray-400 text-sm mt-2">
            Stollar bo'limidan yangi sessiya boshlang
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activeSessions.map((session) => (
            <div key={session._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {session.table?.name}
                </h3>
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Faol
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {session.customer && (
                  <div className="text-sm text-gray-600">
                    Mijoz: <span className="font-medium">{session.customer.name}</span>
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  Boshlangan: <span className="font-medium">{formatTime(session.startTime)}</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  Davomiyligi: <span className="font-medium text-blue-600">
                    {formatDuration(session.currentDuration)}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  Soatlik tarif: <span className="font-medium">{session.hourlyRate.toLocaleString()} so'm</span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">O'yin summasi:</span>
                    <span className="font-medium">{session.currentGameAmount.toLocaleString()} so'm</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Qo'shimcha:</span>
                    <span className="font-medium">{session.currentAdditionalAmount.toLocaleString()} so'm</span>
                  </div>
                  
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Jami:</span>
                    <span className="text-blue-600">{session.currentTotalAmount.toLocaleString()} so'm</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleAddOrders(session._id)}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  Qo'shimcha Buyurtma ({session.additionalOrders.length})
                </button>
                
                <button
                  onClick={() => handleCompleteSession(session._id)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  O'yinni Tugatish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedSession && showOrdersModal && (
        <AdditionalOrdersModal
          sessionId={selectedSession}
          onClose={() => {
            setShowOrdersModal(false);
            setSelectedSession(null);
          }}
        />
      )}

      {selectedSession && showCompleteModal && (
        <CompleteSessionModal
          sessionId={selectedSession}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedSession(null);
          }}
        />
      )}
    </div>
  );
}
