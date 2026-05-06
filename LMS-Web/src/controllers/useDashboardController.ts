"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchDashboard } from "@/services/authService";
import { fetchLeaveBalances } from "@/services/authService";
import { fetchAttendanceSummary } from "@/services/attendanceService";
import { fetchHRDashboard, fetchHRAnalytics } from "@/services/hrmsService";
import { DashboardData } from "@/models/employee";
import { LeaveBalance } from "@/models/leave";
import { AttendanceSummary } from "@/models/attendance";
import { HRDashboardStats, HRAnalytics } from "@/models/hrms";

export function useDashboardController() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [hrStats, setHrStats] = useState<HRDashboardStats | null>(null);
  const [hrAnalytics, setHrAnalytics] = useState<HRAnalytics | null>(null);
  const [hrView, setHrView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const loadDashboard = useCallback(async (date?: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const qdate = date ?? selectedDate;
    try {
      const [dashData, leaveData] = await Promise.all([
        fetchDashboard(user.card_no),
        fetchLeaveBalances(user.card_no),
      ]);
      setDashboard(dashData);
      setLeaveBalances(leaveData.items || []);

      if (dashData.card_no) {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const fromDate = firstDay.toISOString().split("T")[0];
        const toDate = now.toISOString().split("T")[0];
        try {
          const summaryData = await fetchAttendanceSummary(
            dashData.card_no,
            fromDate,
            toDate
          );
          setAttendanceSummary(summaryData.body);
        } catch {
          // Attendance summary might not be available
        }
      }

      // Load HR dashboard if user is HR admin
      if (user.hr_admin) {
        try {
          const [stats, analytics] = await Promise.all([
            fetchHRDashboard(user.card_no, qdate),
            fetchHRAnalytics(user.card_no, qdate),
          ]);
          setHrStats(stats);
          setHrAnalytics(analytics);
        } catch {
          // HR dashboard might not be available
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  const handleSetSelectedDate = useCallback((date: string) => {
    setSelectedDate(date);
    loadDashboard(date);
  }, [loadDashboard]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    dashboard,
    leaveBalances,
    attendanceSummary,
    hrStats,
    hrAnalytics,
    hrView,
    setHrView,
    loading,
    error,
    selectedDate,
    setSelectedDate: handleSetSelectedDate,
    refresh: loadDashboard,
  };
}
