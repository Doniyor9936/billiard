import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ReportsView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dailyReport = useQuery(api.reports.getDailyReport, { date: selectedDate });
  const overallStats = useQuery(api.reports.getOverallStats);
  const sessionHistory = useQuery(api.sessions.getSessionHistory, { limit: 20 });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("uz-UZ");
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("uz-UZ");
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}s ${remainingMinutes}d`;
    }
    return `${remainingMinutes}d`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hisobotlar</h1>
      </div>

      {/* Umumiy statistika */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{overallStats.activeSessionsCount}</div>
            <div className="text-gray-600">Faol sessiyalar</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{overallStats.todayRevenue.toLocaleString()}</div>
            <div className="text-gray-600">Bugungi tushum (so'm)</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{overallStats.totalCustomers}</div>
            <div className="text-gray-600">Jami mijozlar</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{overallStats.totalDebt.toLocaleString()}</div>
            <div className="text-gray-600">Umumiy qarzlar (so'm)</div>
          </div>
        </div>
      )}

      {/* Kunlik hisobot */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Kunlik Hisobot</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {!dailyReport ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dailyReport.totalSessions}</div>
              <div className="text-gray-600">Sessiyalar soni</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dailyReport.totalRevenue.toLocaleString()}</div>
              <div className="text-gray-600">Umumiy tushum (so'm)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dailyReport.totalPaid.toLocaleString()}</div>
              <div className="text-gray-600">To'langan (so'm)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{dailyReport.totalDebt.toLocaleString()}</div>
              <div className="text-gray-600">Qarzlar (so'm)</div>
            </div>
          </div>
        )}

        {dailyReport && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Tushum tarkibi</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">O'yin tushumi:</span>
                  <span className="font-medium">{dailyReport.totalGameRevenue.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Qo'shimcha tushum:</span>
                  <span className="font-medium">{dailyReport.totalAdditionalRevenue.toLocaleString()} so'm</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">To'lovlar</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Naqd:</span>
                  <span className="font-medium">{dailyReport.payments.cash.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Karta:</span>
                  <span className="font-medium">{dailyReport.payments.card.toLocaleString()} so'm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Qarz to'lovlari:</span>
                  <span className="font-medium">{dailyReport.payments.debtPayments.toLocaleString()} so'm</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sessiyalar tarixi */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">So'nggi Sessiyalar</h2>
        </div>
        
        {!sessionHistory ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mijoz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sana
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Davomiyligi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Summa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    To'langan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qarz
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessionHistory.sessions.map((session) => (
                  <tr key={session._id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {session.table?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {session.customer?.name || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {session.customer?.phone || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      <div>{formatDate(session.endTime!)}</div>
                      <div className="text-xs">{formatTime(session.endTime!)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDuration(session.duration!)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {session.totalAmount!.toLocaleString()} so'm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">
                      {session.paidAmount!.toLocaleString()} so'm
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {session.debtAmount! > 0 ? (
                        <span className="text-red-600 font-medium">
                          {session.debtAmount!.toLocaleString()} so'm
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sessionHistory && sessionHistory.sessions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Hozircha sessiyalar tarixi yo'q</div>
          </div>
        )}
      </div>
    </div>
  );
}
