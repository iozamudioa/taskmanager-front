export interface CreateHouseRequest {
    name: string;
    userId: number;
}

export interface HouseResponse {
    id: number;
    name: string;
    createdAt: string;
    code: string;
}

export interface HouseMemberResponse {
    id: number;
    houseId: number;
    userId: number;
    createdAt: string;
    roleId: number;
}

export interface AddMemberRequest {
    userId: number;
    roleId: number;
}

export interface JoinHouseRequest {
    code?: string;
    userId: number;
    roleId: number;
}

export interface UpdateMemberRoleRequest {
    roleId: number;
}

/** roleId 1 = owner, 2 = admin, 3 = member */
export const ROLE_OWNER = 1;
export const ROLE_ADMIN = 2;
export const ROLE_MEMBER = 3;

export function roleName(roleId: number): string {
    switch (roleId) {
        case ROLE_OWNER: return 'Propietario';
        case ROLE_ADMIN: return 'Admin';
        case ROLE_MEMBER: return 'Miembro';
        default: return 'Desconocido';
    }
}
