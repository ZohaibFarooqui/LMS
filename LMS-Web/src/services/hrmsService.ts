import { apiRequest } from "./api";
import { HRMSEmployee, HRMSEmployeeCreate, HRMSSearchResult, HRDashboardStats, HRAnalytics } from "@/models/hrms";

export async function searchHRMSEmployees(
  query: string,
  adminCardNo: string
): Promise<{ items: HRMSSearchResult[] }> {
  return apiRequest(
    `/hrms/employees/search?q=${encodeURIComponent(query)}&admin_card_no=${adminCardNo}`
  );
}

export async function getHRMSEmployee(
  empcode: string,
  adminCardNo: string
): Promise<HRMSEmployee> {
  return apiRequest<HRMSEmployee>(
    `/hrms/employees/${empcode}?admin_card_no=${adminCardNo}`
  );
}

export async function createHRMSEmployee(
  data: HRMSEmployeeCreate,
  adminCardNo: string
): Promise<{ status: string; message: string; empcode?: string }> {
  return apiRequest(`/hrms/employees?admin_card_no=${adminCardNo}`, {
    method: "POST",
    body: data,
  });
}

export async function updateHRMSEmployee(
  empcode: string,
  data: Partial<HRMSEmployeeCreate>,
  adminCardNo: string
): Promise<{ status: string; message: string }> {
  return apiRequest(`/hrms/employees/${empcode}?admin_card_no=${adminCardNo}`, {
    method: "PUT",
    body: data,
  });
}

export async function listHRMSEmployees(
  adminCardNo: string,
  status?: string
): Promise<{ items: HRMSSearchResult[] }> {
  const params = new URLSearchParams({ admin_card_no: adminCardNo });
  if (status) params.set("status", status);
  return apiRequest(`/hrms/employees?${params.toString()}`);
}

export async function fetchHRDashboard(
  adminCardNo: string,
  date?: string
): Promise<HRDashboardStats> {
  const params = new URLSearchParams({ admin_card_no: adminCardNo });
  if (date) params.set("date", date);
  return apiRequest<HRDashboardStats>(`/hrms/dashboard?${params.toString()}`);
}

export async function fetchHRAnalytics(adminCardNo: string, date?: string): Promise<HRAnalytics> {
  const params = new URLSearchParams({ admin_card_no: adminCardNo });
  if (date) params.set("date", date);
  return apiRequest<HRAnalytics>(`/hrms/dashboard/analytics?${params.toString()}`);
}
