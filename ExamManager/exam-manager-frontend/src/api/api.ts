import { IExamUpcoming } from '@/interfaces/IExamUpcoming';
import { ExamFormData, IExam } from '../interfaces/IExam';
import { ExaminerFormData, IExaminer } from '../interfaces/IExaminer';
import { ExamTypeFormData, IExamType } from '../interfaces/IExamType';
import { IInstitution, InstitutionFormData } from '../interfaces/IInstitution';
import { IOperator, OperatorCreateFormData } from '../interfaces/IOperator';
import { IProfession, ProfessionFormData } from '../interfaces/IProfession';
import axiosInstance from './axios.config';

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
}

const Exams = {
  updateExam: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(`/exams/update-exam/${id}`, patchDocument, {
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
    });
  },
  getAllExams: () => {
    return axiosInstance.get<IExam[]>(`/exams/get-all-exams`);
  },
  getUpcomingExams: (daysAhead: number = 3) => {
    return axiosInstance.get<IExamUpcoming[]>(`/exams/upcoming-exams?daysAhead=${daysAhead}`);
  },
  createExam: async (examData: ExamFormData): Promise<IExam> => {
    const payload = {
      examName: examData.examName,
      examCode: examData.examCode,
      examDate: new Date(examData.examDate).toISOString(),
      status: examData.status,
      professionId: Number(examData.professionId),
      institutionId: Number(examData.institutionId),
      examTypeId: Number(examData.examTypeId),
      examBoards: examData.examBoards,
    };

    const response = await axiosInstance.post<IExam>('/exams/create-new-exam', payload);
    return response.data;
  },
  deleteExam: async (id: number) => {
    return axiosInstance.delete(`/exams/delete-exam/${id}`);
  },
};

const ExamTypes = {
  updateExamType: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(`/exam_types/update-exam-type/${id}`, patchDocument, {
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
    });
  },
  getAllExamTypes: () => {
    return axiosInstance.get<IExamType[]>(`/exam_types/get-all-exam-types`);
  },
  createExamType: async (examTypeData: ExamTypeFormData): Promise<IExamType> => {
    const payload = {
      ...examTypeData,
    };

    const response = await axiosInstance.post<IExamType>(
      '/exam_types/create-new-exam-type',
      payload
    );
    return response.data;
  },
  deleteExamType: async (id: number) => {
    return axiosInstance.delete(`/exam_types/delete-exam-type/${id}`);
  },
};

const Examiners = {
  updateExaminer: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(`/examiners/update-examiner/${id}`, patchDocument, {
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
    });
  },
  getAllExaminers: () => {
    return axiosInstance.get<IExaminer[]>(`/examiners/get-all-examiners`);
  },
  createExaminer: async (examinerData: ExaminerFormData) => {
    const payload = {
      ...examinerData,
      dateOfBirth: new Date(examinerData.dateOfBirth).toISOString(),
    };

    const response = await axiosInstance.post<IExaminer>('/examiners/create-new-examiner', payload);
    return response.data;
  },
  deleteExaminer: async (id: number) => {
    return axiosInstance.delete(`/examiners/delete-examiner/${id}`);
  },
};

const Exports = {
  exportExaminers: () => {
    return axiosInstance.get(`/export/export-examiners`, { responseType: 'blob' });
  },
  exportProfessions: () => {
    return axiosInstance.get(`/export/export-professions`, { responseType: 'blob' });
  },
  exportInstitutions: () => {
    return axiosInstance.get(`/export/export-institutions`, { responseType: 'blob' });
  },
  exportExamTypes: () => {
    return axiosInstance.get(`/export/export-exam-types`, { responseType: 'blob' });
  },
  exportExams: () => {
    return axiosInstance.get(`/export/export-exams`, { responseType: 'blob' });
  },
};

const Institutions = {
  updateInstitution: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(`/institutions/update-institution/${id}`, patchDocument, {
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
    });
  },
  getAllInstitutions: () => {
    return axiosInstance.get<IInstitution[]>(`/institutions/get-all-institutions`);
  },
  createInstitution: async (institutionData: InstitutionFormData): Promise<IInstitution> => {
    const payload = {
      ...institutionData,
      zipCode: Number(institutionData.zipCode),
    };

    const response = await axiosInstance.post<IInstitution>(
      '/institutions/create-new-institution',
      payload
    );
    return response.data;
  },
  deleteInstitution: async (id: number) => {
    return axiosInstance.delete(`/institutions/delete-institution/${id}`);
  },
};

const Professions = {
  updateProfession: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(`/professions/update-profession/${id}`, patchDocument, {
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
    });
  },
  getAllProfessions: () => {
    return axiosInstance.get<IProfession[]>(`/professions/get-all-professions`);
  },
  createProfession: async (professionData: ProfessionFormData): Promise<IProfession> => {
    const payload = {
      ...professionData,
    };

    const response = await axiosInstance.post<IProfession>(
      '/professions/create-new-profession',
      payload
    );
    return response.data;
  },
  deleteProfession: async (id: number) => {
    return axiosInstance.delete(`/professions/delete-profession/${id}`);
  },
};

const Operators = {
  getAllOperators: () => {
    return axiosInstance.get<IOperator[]>('/operators/get-all-operators');
  },
  getOperatorById: (id: number) => {
    return axiosInstance.get<IOperator>(`/operators/get-operator/${id}`);
  },
  createOperator: async (operatorData: OperatorCreateFormData): Promise<IOperator> => {
    const payload = {
      ...operatorData,
    };
    const response = await axiosInstance.post<IOperator>('/operators/register', payload);
    return response.data;
  },
  updateOperator: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(`/operators/update-profile/${id}`, patchDocument, {
      headers: {
        'Content-Type': 'application/json-patch+json',
      },
    });
  },
  deleteOperator: async (id: number) => {
    return axiosInstance.delete(`/operators/delete-operator/${id}`);
  },
  restoreOperator: async (id: number) => {
    return axiosInstance.post(`/operators/restore-operator/${id}`);
  },
  assignRole: async (id: number, newRole: string) => {
    return axiosInstance.post(`/operators/assign-role/${id}?newRole=${newRole}`);
  },
};

const api = { Exams, ExamTypes, Examiners, Exports, Institutions, Professions, Operators };

export default api;
