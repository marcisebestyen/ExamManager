export interface IExaminer {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  identityCardNumber: string;
}

export interface ExaminerFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  identityCardNumber: string;
}