export interface IUniqueKey {
  uuid: string;
  postId: number;
  blogName: string;
  categoryId:number;
}

export interface IMigrationDTO {
  sessionId?: string;
  storageId?: string;
  uuid?: string;
  clientKeys?: any;
  uniqueKey?: IUniqueKey;
  uniqueKeys?: IUniqueKey[];
  targetUniqueKey?: Omit<IUniqueKey, 'postId'>;
  page?: number;
}
