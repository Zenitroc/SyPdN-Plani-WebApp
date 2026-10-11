export type RoleCode = 'GURU' | string;
export interface AuthUser { id: bigint; name: string; roles: RoleCode[]; courseIds: bigint[]; }
