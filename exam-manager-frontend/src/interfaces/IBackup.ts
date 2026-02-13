export enum ActivityType {
  Auto = 0,
  Manual = 1,
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