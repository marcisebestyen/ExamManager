export interface IExamBoard {
  id: number;
  examId: number;
  examName: string;
  examCode: string;
  examinerId: number;
  examinerFirstName: string;
  examinerLastName: string;
  role: string;
}

export interface ExamBoardFormData {
  examinerId: number;
  role: string;
}