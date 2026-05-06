"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, RefreshCw, ChevronRight, Clock, Navigation } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { apiRequest } from "@/services/api";

// ─── Types ────────────────────────────────────────────────

interface EmployeeLocationSummary {
  card_no: string;
  employee_name: string;
  empcode: string | null;
  point_count: number;
  last_seen: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_accuracy: number;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
}

// ─── Helpers ──────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatTime(isoStr: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr.replace(" ", "T"));
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoStr;
  }
}

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ─── Detail drawer ────────────────────────────────────────

function PointsDrawer({
  emp,
  date,
  adminCardNo,
  onClose,
}: {
  emp: EmployeeLocationSummary;
  date: string;
  adminCardNo: string;
  onClose: () => void;
}) {
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiRequest<{ body: { points: LocationPoint[] } }>(
      `/auth/location/history/${emp.card_no}?date=${date}&admin_card_no=${adminCardNo}`
    )
      .then((r) => setPoints(r.body.points))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [emp.card_no, date, adminCardNo]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-indigo-50">
          <div>
            <p className="font-semibold text-gray-900">{emp.employee_name}</p>
            <p className="text-xs text-gray-500">
              Card {emp.card_no} · {date} · {emp.point_count} point{emp.point_count !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-indigo-100 text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          )}
          {!loading && !error && points.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No points found.</p>
          )}
          {!loading &&
            points.map((pt, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors"
              >
                <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      {formatTime(pt.recorded_at)}
                    </span>
                    {pt.accuracy > 0 && (
                      <span className="text-xs text-gray-400">
                        ±{Math.round(pt.accuracy)}m
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">
                    {pt.latitude.toFixed(6)}, {pt.longitude.toFixed(6)}
                  </p>
                </div>
                <a
                  href={mapsUrl(pt.latitude, pt.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-500 transition-colors"
                  title="Open in Google Maps"
                >
                  <Navigation className="h-4 w-4" />
                </a>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────

export function LocationPanel({ adminCardNo }: { adminCardNo: string }) {
  const [date, setDate] = useState(todayStr());
  const [summary, setSummary] = useState<EmployeeLocationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmployeeLocationSummary | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiRequest<{ body: { employees: EmployeeLocationSummary[] } }>(
      `/auth/location/summary?date=${date}&admin_card_no=${adminCardNo}`
    )
      .then((r) => setSummary(r.body.employees))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load locations")
      )
      .finally(() => setLoading(false));
  }, [date, adminCardNo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Employee Locations</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && summary.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No location data recorded for {date}.</p>
          <p className="text-xs mt-1 text-gray-400">
            Employees must have the LMS app running with location tracking enabled.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && summary.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {["Employee", "Card No", "Last Seen", "Coordinates", "Points", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {summary.map((emp) => (
                <tr
                  key={emp.card_no}
                  className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(emp)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {emp.employee_name}
                    </p>
                    {emp.empcode && (
                      <p className="text-xs text-gray-400">{emp.empcode}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {emp.card_no}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      {formatTime(emp.last_seen)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {emp.last_latitude != null ? (
                      <a
                        href={mapsUrl(emp.last_latitude, emp.last_longitude!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-mono"
                      >
                        <Navigation className="h-3 w-3" />
                        {emp.last_latitude.toFixed(5)}, {emp.last_longitude!.toFixed(5)}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {emp.point_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <PointsDrawer
          emp={selected}
          date={date}
          adminCardNo={adminCardNo}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
