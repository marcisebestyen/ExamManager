import { ExamTypeFormData, IExamType } from '../interfaces/IExamType';
import axiosInstance from './axios.config';

interface JsonPatchOperation {
  op: 'replace' | 'add' | 'remove' | 'copy' | 'move' | 'test';
  path: string;
  value?: any;
  from?: string;
}

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
    // delete (payload as any).PricePerDay;

    const response = await axiosInstance.post<IExamType>('/exam_types/create-new-exam-type', payload);
    return response.data;
  },
  deleteExamType: async (id: number) => {
    return axiosInstance.delete(`/exam_types/delete-exam-type/${id}`);
  }
};

const api = { ExamTypes };

export default api;
