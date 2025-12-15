import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type CashbackRow = {
  _id: string;
  amount: number;
  type: "earned" | "spent";
  source: string;
  description: string;
  status: "active" | "expired" | "used";
  createdAt: number;
  expiresAt?: number;
};

const statusStyles: Record<CashbackRow["status"], string> = {
  active: "bg-green-100 text-green-700",
  used: "bg-blue-100 text-blue-700",
  expired: "bg-red-100 text-red-700",
};



export function CashbackView() {
  const balance = useQuery(api.cashbacks.getBalance);
  const history = useQuery(api.cashbacks.getHistory, { limit: 50 }) as
    | CashbackRow[]
    | undefined;

  const totals = useMemo(() => {
    if (!history) return { earned: 0, spent: 0 };
    return history.reduce(
      (acc: { earned: number; spent: number }, row: CashbackRow) => {
        if (row.type === "earned") acc.earned += row.amount;
        if (row.type === "spent") acc.spent += row.amount;
        return acc;
      },
      { earned: 0, spent: 0 },
    );
  }, [history]);

  if (balance === undefined || history === undefined) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cashback</h1>
        <p className="text-gray-600">
          Cashback balansingiz va tranzaksiyalar tarixi
        </p>
      </div>

      {/* Balans kartalari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="text-sm text-gray-500">Joriy balans</div>
          <div className="text-3xl font-bold text-blue-700 mt-2">
            {balance?.balance?.toLocaleString() || 0} so'm
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="text-sm text-gray-500">Jami to'plangan</div>
          <div className="text-3xl font-bold text-green-700 mt-2">
            {balance?.totalEarned?.toLocaleString() || 0} so'm
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="text-sm text-gray-500">Jami ishlatilgan</div>
          <div className="text-3xl font-bold text-red-600 mt-2">
            {balance?.totalSpent?.toLocaleString() || 0} so'm
          </div>
        </div>
      </div>

      {/* Tarix sarlavhasi */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Cashback tarixi
          </h2>
          <p className="text-sm text-gray-500">
            Oxirgi {history?.length || 0} ta operatsiya
          </p>
        </div>
        <div className="hidden md:flex space-x-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Berilgan
            ({totals.earned.toLocaleString()} so'm)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> Ishlatilgan
            ({totals.spent.toLocaleString()} so'm)
          </span>
        </div>
      </div>

      {/* Tarix jadvali */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ta'rif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Summasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amal qilish muddati
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history && history.length > 0 ? (
                history.map((row: CashbackRow) => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(row.createdAt).toLocaleString("uz-UZ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="font-medium text-gray-900">{row.description}</div>
                      <div className="text-xs text-gray-500">Manba: {row.source}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span
                        className={
                          row.type === "earned" ? "text-green-600" : "text-red-600"
                        }
                      >
                        {row.type === "earned" ? "+" : "-"}
                        {row.amount.toLocaleString()} so'm
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${statusStyles[row.status]}`}
                      >
                        {row.status === "active" && "Faol"}
                        {row.status === "used" && "Ishlatilgan"}
                        {row.status === "expired" && "Muddati o'tgan"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.expiresAt
                        ? new Date(row.expiresAt).toLocaleDateString("uz-UZ")
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-sm text-gray-500"
                  >
                    Hozircha cashback operatsiyalari mavjud emas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}