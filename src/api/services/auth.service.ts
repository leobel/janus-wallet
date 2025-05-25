import path from "path";
import { fileURLToPath } from 'url';
import jwt, { VerifyErrors } from 'jsonwebtoken'
import { User } from "../../models/user";
import type { StringValue } from "ms";
import bcrypt from "bcrypt"
import { NextFunction,  Request, Response  } from "express";
import { getUserByTokenName } from "../../repositories/user.repository";
import { fromText } from "../../utils/converter";
import { toText } from "@lucid-evolution/lucid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET!;

interface JWTPayload {
  id: string;
  username: string;
  [key: string]: any;
}

// In production, persist refresh tokens in DB or Redis
let refreshTokensStore: string[] = [];

export const ACCESS_TOKEN_KEY = '_uatk';
export const REFRESH_TOKEN_KEY = '_urtk';

// Generate tokens
export function generateAccessToken(user: JWTPayload, expiresIn?: number | StringValue) { // '15m'
  return jwt.sign({user}, ACCESS_TOKEN_SECRET, { expiresIn });
}

export function generateRefreshToken(user: JWTPayload, expiresIn?: number | StringValue) { // 7d
  const token = jwt.sign({user}, REFRESH_TOKEN_SECRET, { expiresIn });
  refreshTokensStore.push(token);
  return token;
}

// Auth middleware
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies ? req.cookies[ACCESS_TOKEN_KEY] : null;
    if (!token) res.sendStatus(401);
    else {
        jwt.verify(token, ACCESS_TOKEN_SECRET, (err: VerifyErrors | null, _decoded: any) => {
          if (err) res.sendStatus(403);
          else {
            next();
          }
        });
    }
}

export function refreshToken(req: Request, expiresIn?: number | StringValue): Promise<string | null> {
    const token = req.cookies ? req.cookies[REFRESH_TOKEN_KEY] : null;
    if (!token || !refreshTokensStore.includes(token)) return Promise.resolve(null)
        
    return new Promise((resolve) => {
        jwt.verify(token, REFRESH_TOKEN_SECRET, (err: VerifyErrors | null, decoded: any) => {
            if (err) resolve(null)
            resolve(generateAccessToken(decoded.user, expiresIn))
        });
    })
}

export function isLoggedIn(req: Request): Promise<boolean> {
    const token = req.cookies ? req.cookies[ACCESS_TOKEN_KEY] : null;
    if (!token) return Promise.resolve(false)
    return new Promise((resolve) => {
        jwt.verify(token, ACCESS_TOKEN_SECRET, (err: VerifyErrors | null, _decoded: any) => {
            if (err) resolve(false)
            resolve(true)
        });
    })
}

export function removeToken(req: Request) {
    const token = req.cookies ? req.cookies[REFRESH_TOKEN_KEY] : null;
    if (!token) return
    refreshTokensStore = refreshTokensStore.filter(t => t != token)
}

export async function getUserByCredentials(username: string, password: string): Promise<User | null> {
    const tokenName = fromText(username)
    const user = await getUserByTokenName(tokenName)
    const hash = user?.pwd_kdf_hash ? toText(user?.pwd_kdf_hash) : "$2b$10$ly7CpcrlBxnwywAkZ4INDP"
    try {
        const isValid = await bcrypt.compare(password, hash)
        if (!isValid || !user) {
            return null
        }

        return user
    } catch {
        return null
    }
}