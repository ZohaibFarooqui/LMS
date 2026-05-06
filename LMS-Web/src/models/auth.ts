export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  card_no: string;
  emp_name: string;
  face_registered: boolean;
  hr_admin: boolean;
}

export interface User {
  card_no: string;
  emp_name: string;
  face_registered: boolean;
  hr_admin: boolean;
}
