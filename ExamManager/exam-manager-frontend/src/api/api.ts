import axiosInstance from "./axios.config";
import {ExamTypeFormData, IExamType} from "../interfaces/IExamType";

interface JsonPatchOperation {
  op: "replace" | "add" | "remove" | "copy" | "move" | "test";
  path: string;
  value?: any;
  from?: string;
}

const ExamTypes = {
  getExamTypes: (startDate: Date, endDate: Date) => {
    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();
    return axiosInstance.get<IExamType[]>(
      `/cars/available?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
    );
  },
  updateExamType: (id: number, patchDocument: JsonPatchOperation[]) => {
    return axiosInstance.patch<void>(
      `/cars/update/${id}`,
      patchDocument,
      {
        headers: {
          'Content-Type': 'application/json-patch+json'
        }
      }
    );
  },
  getAllExamTypes: () => {
    return axiosInstance.get<IExamType[]>(
      `/exam_types/get-all-exam-types`
    );
  },
  createExamType: async (examTypeData: ExamTypeFormData): Promise<IExamType> => {
    const payload = {
      ...examTypeData,
      pricePerDay: Number(examTypeData.PricePerDay),
      ActualKilometers: Number(examTypeData.ActualKilometers),
    };
    delete (payload as any).PricePerDay;

    const response = await axiosInstance.post<IExamType>('/cars/create-car', payload);
    return response.data;
  },
};

const api = { ExamTypes };

export default api;