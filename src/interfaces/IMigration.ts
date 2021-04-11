export interface IMigration {
  mainClientId?: string;
  storageData?: any;
  uniqueKey?: string;
  uniqueKeys?: any;
  targetUniqueKey?: string;
  socketId?: string;

  page?: number; // 임시임.
  authToken?: string; // 임시임.
}
