"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function WarehousePage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [lastScored, setLastScored] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/warehouse/priority-queue")
      .then((r) => r.json())
      .then((data) => { setQueue(data); setLoading(false); });
  }, []);

  const handleRunScoring = async () => {
    setScoring(true);
    setError("");
    const res = await fetch("/api/warehouse/run-scoring", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Scoring failed.");
    } else {
      setQueue(data);
      setLastScored(new Date().toLocaleTimeString());
    }
    setScoring(false);
  };

  const handleConfirm = async (order_id: number, confirmed_fraud: boolean) => {
    setConfirming(order_id);
    await fetch("/api/warehouse/confirm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id, confirmed_fraud }),
    });
    setQueue((prev) =>
      prev.map((row) =>
        row.order_id === order_id ? { ...row, confirmed_fraud } : row
      )
    );
    setConfirming(null);
  };

  const riskColor = (score: number) => {
    if (score >= 0.75) return "text-red-700 font-bold";
    if (score >= 0.40) return "text-orange-600 font-semibold";
    return "text-yellow-600";
  };

  const riskLabel = (score: number) => {
    if (score >= 0.75) return { label: "High", cls: "bg-red-100 text-red-700" };
    if (score >= 0.40) return { label: "Medium", cls: "bg-orange-100 text-orange-700" };
    return { label: "Low", cls: "bg-yellow-100 text-yellow-700" };
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Fraud Risk Priority Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Top 50 orders ranked by predicted fraud probability (model1.sav · XGBoost).
            {lastScored && <span className="ml-2 text-green-600">Last scored: {lastScored}</span>}
          </p>
        </div>
        <button
          onClick={handleRunScoring}
          disabled={scoring}
          className="bg-indigo-600 text-white px-5 py-2 rounded font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {scoring ? (
            <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Scoring…</>
          ) : (
            "▶ Run Scoring"
          )}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      {loading ? (
        <p className="text-gray-400">Loading queue…</p>
      ) : queue.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No scores yet.</p>
          <p className="text-sm mt-1">Click <strong>Run Scoring</strong> to generate fraud predictions.</p>
        </div>
      ) : (
        <div className="rounded border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Rank</th>
                <th className="px-3 py-2 text-left">Risk Score</th>
                <th className="px-3 py-2 text-left">Risk Level</th>
                <th className="px-3 py-2 text-left">Model Prediction</th>
                <th className="px-3 py-2 text-left">Admin Confirmation</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Order #</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left">Payment</th>
                <th className="px-3 py-2 text-left">Device</th>
                <th className="px-3 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-left">Late?</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue.map((row: any, i: number) => {
                const customer = row.customers as any;
                const ship = row.shipments as any;
                const score = parseFloat(row.risk_score);
                const { label, cls } = riskLabel(score);
                const isFraud: boolean = row.predicted_fraud === 1;
                const confirmed: boolean | null = row.confirmed_fraud ?? null;
                const isConfirming = confirming === row.order_id;
                return (
                  <tr key={row.order_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 font-mono">{i + 1}</td>
                    <td className={`px-3 py-2 font-mono ${riskColor(score)}`}>{score.toFixed(4)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls}`}>{label}</span>
                    </td>

                    {/* Model is_fraud prediction */}
                    <td className="px-3 py-2">
                      {row.predicted_fraud === null || row.predicted_fraud === undefined ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : isFraud ? (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-700">Fraud</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-100 text-green-700">Not Fraud</span>
                      )}
                    </td>

                    {/* Admin confirmation */}
                    <td className="px-3 py-2">
                      {confirmed === true ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-200 text-red-800">✓ Confirmed Fraud</span>
                          <button
                            onClick={() => handleConfirm(row.order_id, false)}
                            disabled={isConfirming}
                            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                            title="Mark as not fraud"
                          >✕</button>
                        </div>
                      ) : confirmed === false ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-200 text-green-800">✓ Not Fraud</span>
                          <button
                            onClick={() => handleConfirm(row.order_id, true)}
                            disabled={isConfirming}
                            className="text-xs text-gray-400 hover:text-gray-600 ml-1"
                            title="Mark as fraud"
                          >✕</button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleConfirm(row.order_id, true)}
                            disabled={isConfirming}
                            className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            Fraud
                          </button>
                          <button
                            onClick={() => handleConfirm(row.order_id, false)}
                            disabled={isConfirming}
                            className="text-xs px-2 py-0.5 rounded border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-40"
                          >
                            Safe
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      {customer ? (
                        <Link href={`/customers/${customer.customer_id}`} className="hover:underline text-blue-600">
                          {customer.full_name}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-500">#{row.order_id}</td>
                    <td className="px-3 py-2">${parseFloat(row.order_total).toFixed(2)}</td>
                    <td className="px-3 py-2 capitalize">{row.payment_method}</td>
                    <td className="px-3 py-2 capitalize">{row.device_type}</td>
                    <td className="px-3 py-2">{row.ip_country}</td>
                    <td className="px-3 py-2">
                      {ship?.late_delivery ? (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Late</span>
                      ) : ship ? (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">On time</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(row.order_datetime).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
