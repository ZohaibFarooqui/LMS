import { apiRequest } from "./api";

export interface Department  { dept_no: number; dept_name: string }
export interface Grade       { grade_cd: string; descr: string }
export interface Designation { grade_cd: string; desg_cd: string; desg_desc: string }
export interface Shift       { shift: string; shift_desc: string; time_from?: string; time_to?: string }
export interface BloodGroup  { pk: number; blood_group: string }
export interface Cadre       { pk: number; cadre: string }
export interface Unit            { unit_id: number; unit_name: string }
export interface Religion        { code: string; label: string }
export interface ReportingOfficer { empcode: string; name: string }

export const fetchDepartments  = () => apiRequest<{ items: Department[]  }>("/reference/departments");
export const fetchGrades       = () => apiRequest<{ items: Grade[]       }>("/reference/grades");
export const fetchDesignations = (grade_cd?: string) =>
  apiRequest<{ items: Designation[] }>(`/reference/designations${grade_cd ? `?grade_cd=${grade_cd}` : ""}`);
export const fetchShifts       = () => apiRequest<{ items: Shift[]       }>("/reference/shifts");
export const fetchBloodGroups  = () => apiRequest<{ items: BloodGroup[]  }>("/reference/blood-groups");
export const fetchCadre        = () => apiRequest<{ items: Cadre[]       }>("/reference/cadre");
export const fetchUnits              = () => apiRequest<{ items: Unit[]             }>("/reference/units");
export const fetchReligions          = () => apiRequest<{ items: Religion[]         }>("/reference/religions");
export const fetchReportingOfficers  = () => apiRequest<{ items: ReportingOfficer[] }>("/reference/reporting-officers");

const q = (adminCardNo: string) => `?admin_card_no=${encodeURIComponent(adminCardNo)}`;

export const addDepartment  = (adminCardNo: string, dept_name: string) =>
  apiRequest<Department>(`/reference/departments${q(adminCardNo)}`, { method: "POST", body: { dept_name } });

export const addGrade       = (adminCardNo: string, grade_cd: string, descr: string) =>
  apiRequest<Grade>(`/reference/grades${q(adminCardNo)}`, { method: "POST", body: { grade_cd, descr } });

export const addDesignation = (adminCardNo: string, grade_cd: string, desg_desc: string) =>
  apiRequest<Designation>(`/reference/designations${q(adminCardNo)}`, { method: "POST", body: { grade_cd, desg_desc } });

export const addShift       = (adminCardNo: string, shift: string, shift_desc: string, time_from?: string, time_to?: string) =>
  apiRequest<Shift>(`/reference/shifts${q(adminCardNo)}`, { method: "POST", body: { shift, shift_desc, time_from, time_to } });

export const addBloodGroup  = (adminCardNo: string, blood_group: string) =>
  apiRequest<BloodGroup>(`/reference/blood-groups${q(adminCardNo)}`, { method: "POST", body: { blood_group } });

export const addCadre       = (adminCardNo: string, cadre: string) =>
  apiRequest<Cadre>(`/reference/cadre${q(adminCardNo)}`, { method: "POST", body: { cadre } });

export const addUnit        = (adminCardNo: string, unit_name: string) =>
  apiRequest<Unit>(`/reference/units${q(adminCardNo)}`, { method: "POST", body: { unit_name } });
