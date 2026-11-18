/** Kiểu dữ liệu theo API chương 3 (tên trường = tên cột CSDL, snake_case). */

export type Role = "SYSTEM_ADMIN" | "CONTENT_EDITOR" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";

export interface SchoolBrief {
  id: number;
  code: string;
  name: string;
}

export interface UserBrief {
  id: number;
  full_name: string;
  role: Role;
  school: SchoolBrief | null;
}

export interface TokenOut {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  must_change_password: boolean;
  user: UserBrief;
}

export interface Me {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  school: SchoolBrief | null;
  must_change_password: boolean;
}

export interface FieldError {
  field: string;
  message: string;
}
