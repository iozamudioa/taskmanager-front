export interface HouseListResponse {
    id: number;
    houseId: number;
    name: string;
}

export interface CreateListRequest {
    name: string;
}

export interface ListItemResponse {
    id: number;
    listId: number;
    name: string;
    isCompleted: boolean;
}

export interface AddListItemRequest {
    name: string;
}

export interface CompleteListItemRequest {
    isCompleted: boolean;
}
