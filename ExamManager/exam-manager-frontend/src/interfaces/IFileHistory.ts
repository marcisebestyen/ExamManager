export interface IFileHistory {
  id: number;
  fileName: string;
  contentType: string;
  fileSizeInBytes: number;
  action: string;
  category: string;
  operatorUserName: string;
  createdAt: string;
  isSuccessful: boolean;
  processingNotes?: string;
}
