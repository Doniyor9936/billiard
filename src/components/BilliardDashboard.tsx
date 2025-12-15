import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { TablesView } from "./TablesView";
import { SessionsView } from "./SessionsView";
import { CustomersView } from "./CustomersView";
import { ReportsView } from "./ReportsView";
import { SettingsView } from "./SettingsView";

type TabType = "tables" | "sessions" | "customers" | "reports" | "settings";

export function BilliardDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("tables");
  const stats = useQuery(api.reports.getOverallStats);

  const tabs = [
    { id: "tables" as TabType, name: "Stollar", icon: "🎱" },
    { id: "sessions" as TabType, name: "Sessiyalar", icon: "⏱️" },
    { id: "customers" as TabType, name: "Mijozlar", icon: "👥" },
    { id: "reports" as TabType, name: "Hisobotlar", icon: "📊" },
    { id: "settings" as TabType, name: "Sozlamalar", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Boshqaruv Paneli</h2>
          
          {/* Stats */}
          {stats && (
            <div className="mb-6 space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600">Faol Sessiyalar</div>
                <div className="text-xl font-bold text-blue-800">{stats.activeSessionsCount}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600">Bugungi Tushum</div>
                <div className="text-xl font-bold text-green-800">
                  {stats.todayRevenue.toLocaleString()} so'm
                </div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-sm text-red-600">Umumiy Qarzlar</div>
                <div className="text-xl font-bold text-red-800">
                  {stats.totalDebt.toLocaleString()} so'm
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeTab === "tables" && <TablesView />}
          {activeTab === "sessions" && <SessionsView />}
          {activeTab === "customers" && <CustomersView />}
          {activeTab === "reports" && <ReportsView />}
          {activeTab === "settings" && <SettingsView />}
        </div>
      </div>
    </div>
  );
}
