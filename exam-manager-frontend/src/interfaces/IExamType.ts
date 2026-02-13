export interface IExamType {
  id: number;
  typeName: string;
  description: string;
}

export interface ExamTypeFormData {
  typeName: string;
  description?: string;
}