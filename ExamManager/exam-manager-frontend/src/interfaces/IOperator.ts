export interface IOperator {
  id: number;
  userName: string;
  firstName: string;
  lastName: string;
  role: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedByOperatorName?: string;
}

export interface OperatorFormData {
  firstName: string;
  lastName: string;
  role?: string;
}

export interface OperatorCreateFormData extends OperatorFormData {
  userName: string;
  password: string;
}
