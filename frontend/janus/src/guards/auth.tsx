import { createCookie } from "react-router"
import { isLoggedIn } from "../services/auth.service";

export const authCookie = createCookie('access_token')

export default async function isAuthenticated(_req: Request): Promise<boolean> {
    try {
        await isLoggedIn()
        return true
    } catch {
        return false
    }
   
}