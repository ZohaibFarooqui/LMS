"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Check, Loader2, RefreshCw, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import {
  fetchDepartments, fetchGrades, fetchDesignations, fetchShifts,
  fetchBloodGroups, fetchUnits,
  addDepartment, addGrade, addDesignation, addShift, addBloodGroup, addUnit,
  type Department, type Grade, type Designation, type Shift, type BloodGroup, type Unit,
} from "@/services/referenceService";

// ─── Types ────────────────────────────────────────────────

type Tab = "departments" | "grades" | "designations" | "shifts" | "blood_groups" | "units";

const TABS: { id: Tab; label: string }[] = [
  { id: "departments",  label: "Departments" },
  { id: "grades",       label: "Grades" },
  { id: "designations", label: "Designations" },
  { id: "shifts",       label: "Shifts" },
  { id: "blood_groups", label: "Blood Groups" },
  { id: "units",        label: "Units" },
];

// ─── Inline add row ───────────────────────────────────────

function AddRow({
  fields,
  onSave,
}: {
  fields: { key: string; label: string; placeholder: string }[];
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (fields.some((f) => !values[f.key].trim())) {
      setError("All fields are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      setValues(Object.fromEntries(fields.map((f) => [f.key, ""])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="bg-indigo-50/60">
      {fields.map((f) => (
        <td key={f.key} className="px-4 py-2">
          <input
            type="text"
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder={f.placeholder}
            className="w-full border border-indigo-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </td>
      ))}
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
      </td>
    </tr>
  );
}

// ─── Table wrapper ────────────────────────────────────────

function MasterTable({
  columns,
  rows,
  loading,
  onRefresh,
  addFields,
  onAdd,
}: {
  columns: string[];
  rows: (string | number | null | undefined)[][];
  loading: boolean;
  onRefresh: () => void;
  addFields: { key: string; label: string; placeholder: string }[];
  onAdd: (values: Record<string, string>) => Promise<void>;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{rows.length} records</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" />
            Add New
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {c}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {showAdd && (
              <AddRow
                fields={addFields}
                onSave={async (vals) => {
                  await onAdd(vals);
                  setShowAdd(false);
                  onRefresh();
                }}
              />
            )}
            {loading && (
              <tr>
                <td colSpan={columns.length + 1} className="py-10 text-center">
                  <Spinner />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-10 text-center text-sm text-gray-400"
                >
                  No records found.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-sm text-gray-700">
                      {cell ?? "—"}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────

export function SetupPanel({ adminCardNo }: { adminCardNo: string }) {
  const [tab, setTab] = useState<Tab>("departments");

  // Data
  const [depts,  setDepts]  = useState<Department[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [desigs, setDesigs] = useState<Designation[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bgs,    setBgs]    = useState<BloodGroup[]>([]);
  const [units,  setUnits]  = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      switch (t) {
        case "departments":  { const r = await fetchDepartments();  setDepts(r.items);  break; }
        case "grades":       { const r = await fetchGrades();       setGrades(r.items); break; }
        case "designations": { const r = await fetchDesignations(); setDesigs(r.items); break; }
        case "shifts":       { const r = await fetchShifts();       setShifts(r.items); break; }
        case "blood_groups": { const r = await fetchBloodGroups();  setBgs(r.items);    break; }
        case "units":        { const r = await fetchUnits();        setUnits(r.items);  break; }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  function switchTab(t: Tab) {
    setTab(t);
  }

  // ── Departments ──────────────────────────────────────────
  const deptTable = (
    <MasterTable
      columns={["Dept No", "Department Name"]}
      rows={depts.map((d) => [d.dept_no, d.dept_name])}
      loading={loading}
      onRefresh={() => load("departments")}
      addFields={[
        { key: "dept_name", label: "Department Name", placeholder: "e.g. Human Resources" },
      ]}
      onAdd={async (v) => {
        await addDepartment(adminCardNo, v.dept_name);
      }}
    />
  );

  // ── Grades ───────────────────────────────────────────────
  const gradeTable = (
    <MasterTable
      columns={["Grade Code", "Description"]}
      rows={grades.map((g) => [g.grade_cd, g.descr])}
      loading={loading}
      onRefresh={() => load("grades")}
      addFields={[
        { key: "grade_cd",  label: "Grade Code",   placeholder: "e.g. G1" },
        { key: "descr",     label: "Description",  placeholder: "e.g. Grade 1 Officer" },
      ]}
      onAdd={async (v) => {
        await addGrade(adminCardNo, v.grade_cd, v.descr);
      }}
    />
  );

  // ── Designations ─────────────────────────────────────────
  const [desigGradeFilter, setDesigGradeFilter] = useState("");
  const filteredDesigs = desigGradeFilter
    ? desigs.filter((d) => d.grade_cd === desigGradeFilter)
    : desigs;

  const desigTable = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Filter by grade:</label>
        <select
          value={desigGradeFilter}
          onChange={(e) => setDesigGradeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All Grades</option>
          {grades.map((g) => (
            <option key={g.grade_cd} value={g.grade_cd}>{g.grade_cd} — {g.descr}</option>
          ))}
        </select>
      </div>
      <MasterTable
        columns={["Grade", "Desig Code", "Description"]}
        rows={filteredDesigs.map((d) => [d.grade_cd, d.desg_cd, d.desg_desc])}
        loading={loading}
        onRefresh={() => load("designations")}
        addFields={[
          { key: "grade_cd",  label: "Grade Code",   placeholder: "e.g. G1" },
          { key: "desg_desc", label: "Designation",  placeholder: "e.g. Senior Officer" },
        ]}
        onAdd={async (v) => {
          await addDesignation(adminCardNo, v.grade_cd, v.desg_desc);
        }}
      />
    </div>
  );

  // ── Shifts ───────────────────────────────────────────────
  const shiftTable = (
    <MasterTable
      columns={["Shift Code", "Description", "From", "To"]}
      rows={shifts.map((s) => [s.shift, s.shift_desc, s.time_from ?? "—", s.time_to ?? "—"])}
      loading={loading}
      onRefresh={() => load("shifts")}
      addFields={[
        { key: "shift",      label: "Shift Code",   placeholder: "e.g. A" },
        { key: "shift_desc", label: "Description",  placeholder: "e.g. Morning Shift" },
        { key: "time_from",  label: "Time From",    placeholder: "e.g. 09:00" },
        { key: "time_to",    label: "Time To",      placeholder: "e.g. 17:00" },
      ]}
      onAdd={async (v) => {
        await addShift(adminCardNo, v.shift, v.shift_desc, v.time_from, v.time_to);
      }}
    />
  );

  // ── Blood Groups ─────────────────────────────────────────
  const bgTable = (
    <MasterTable
      columns={["ID", "Blood Group"]}
      rows={bgs.map((b) => [b.pk, b.blood_group])}
      loading={loading}
      onRefresh={() => load("blood_groups")}
      addFields={[
        { key: "blood_group", label: "Blood Group", placeholder: "e.g. AB+" },
      ]}
      onAdd={async (v) => {
        await addBloodGroup(adminCardNo, v.blood_group);
      }}
    />
  );

  // ── Units ────────────────────────────────────────────────
  const unitTable = (
    <MasterTable
      columns={["Unit ID", "Unit Name"]}
      rows={units.map((u) => [u.unit_id, u.unit_name])}
      loading={loading}
      onRefresh={() => load("units")}
      addFields={[
        { key: "unit_name", label: "Unit Name", placeholder: "e.g. Head Office" },
      ]}
      onAdd={async (v) => { await addUnit(adminCardNo, v.unit_name); }}
    />
  );

  const contentMap: Record<Tab, React.ReactNode> = {
    departments:  deptTable,
    grades:       gradeTable,
    designations: desigTable,
    shifts:       shiftTable,
    blood_groups: bgTable,
    units:        unitTable,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900">Setup — Master Tables</h2>
        <span className="text-xs text-gray-400 ml-2">HR Admin only</span>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>{contentMap[tab]}</div>
    </div>
  );
}
