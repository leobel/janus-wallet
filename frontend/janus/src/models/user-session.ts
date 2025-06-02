export interface UserSession {
    id: string;
    username: string;
    hash: string;
    address: string;
    image?: string;
}