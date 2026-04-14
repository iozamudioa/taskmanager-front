export interface CreateUserRequest {
    name: string;
    email: string;
    username: string;
    image?: string;
}

export interface UpdateUserRequest {
    name?: string;
    image?: string;
}

export interface UpdateUserImageRequest {
    image: string;
}

export interface UserResponse {
    id: number;
    name: string;
    email: string;
    username: string;
    image?: string;
}
