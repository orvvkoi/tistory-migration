export interface IAuth {
    mainClientId?:string;
    authToken?: string;
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
    accessToken?: string;
    storageData?: any;
    code?: any;
    error?: any;
    error_reason?: any;
    uniqueKey?: string;
    uniqueKeys?: any;
    targetUniqueKey?: string;
    page?: number;
    socketId?: string;
}

export interface IAuthInputDTO {
    clientId: string;
    clientSecret: string;
    callbackUrl?: string;
    authToken?: string;
}