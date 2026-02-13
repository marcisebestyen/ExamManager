export enum Role {
  Operator = 0,
  Admin = 1
}

export interface Operator {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  role: string;
  token: string;
  mustChangePassword?: boolean;
}