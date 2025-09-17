import { ExamBoardFormData, IExamBoard } from './IExamBoard';


export enum Status {
  PLANNED = 0,
  ACTIVE = 1,
  POSTPONED = 2,
  COMPLETED = 3
}

export const STATUS_LABELS = {
  [Status.PLANNED]: "Planned",
  [Status.ACTIVE]: "Active",
  [Status.POSTPONED]: "Postponed",
  [Status.COMPLETED]: "Completed",
}

export interface ExamFormData {
  examName: string;
  examCode: string;
  examDate: string;
  status: Status;
  professionId: number;
  institutionId: number;
  examTypeId: number;
  examBoards: ExamBoardFormData[];
}

export interface IExam {
  id: number;
  examName: string;
  examCode: string;
  examDate: string;
  status: Status;
  professionId: number;
  professionKeorId: string;
  professionName: string;
  institutionId: number;
  institutionName: string;
  examTypeId: number;
  examTypeName: string;
  operatorId: number;
  operatorUserName: string;
  examBoards: IExamBoard[];
}