export enum ActivityType {
  Manual = 0,
  Auto = 1,
  Restore = 2,
}

export interface IBackupHistory {
  id: number;
  backupDate: string;
  fileName: string;
  activityType: ActivityType;
  isSuccessful: boolean;
  errorMessage?: string;
  operatorId: number;
  operatorUserName: string;
}