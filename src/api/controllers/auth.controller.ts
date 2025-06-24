import { Request, Response, type CookieOptions } from 'express';
import { ACCESS_TOKEN_KEY, generateAccessToken, generateRefreshToken, getUserByCredentials, isLoggedIn, REFRESH_TOKEN_KEY, refreshToken, removeToken, userExist } from '../services/auth.service';
import { Network, toText } from '@lucid-evolution/lucid';
import { createAccountTx } from '../services/wallet.service';
import type { User } from '../../models/user';

export function createAccount(network: Network) {
    return async (req: Request, res: Response) => {
        try {
            const { username, hash, kdf_hash: kdfHash, nonce, utxos, change_address } = req.body
            const {user, cborTx} = await createAccountTx(username, network, hash, kdfHash, utxos, change_address, nonce)

            addCookies(user, res);
            res.status(200).json({
                user: {
                    id: user.id,
                    username: toText(user.token_name),
                    hash: user.pwd_hash,
                    address: user.spend_address,
                },
                cbor_tx: cborTx
            });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

const accessExpiresIn = 60 * 60
const refreshExpiresIn = 7 * 24 * 60 * 60

export async function login(req: Request, res: Response) {
    try {
        const { username, password } = req.body;

        const user = await getUserByCredentials(username, password)
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }
        addCookies(user, res);
        res.status(200).json({
            user: {
                id: user.id,
                username: toText(user.token_name),
                hash: user.pwd_hash,
                address: user.spend_address
            }, message: 'Logged in'
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
}

function addCookies(user: User, res: Response<any, Record<string, any>>) {
    const data = {
        id: user.id,
        username: user.token_name,
        address: user.spend_address,
    };

    const accessToken = generateAccessToken(data, accessExpiresIn);
    const refreshToken = generateRefreshToken(data, refreshExpiresIn);

    const isProduction = process.env.NODE_ENV === 'production'
    const secure = isProduction
    const config: Partial<CookieOptions> = {
        secure,
        domain: isProduction ? process.env.DOMAIN : "localhost",
        sameSite: isProduction ? "none" : "lax",
    }

    // Set cookies
    res.cookie(ACCESS_TOKEN_KEY, accessToken, {
        httpOnly: true, // frontend have access to it.
        maxAge: accessExpiresIn * 1000, // 15 minutes
        ...config
    });
    res.cookie(REFRESH_TOKEN_KEY, refreshToken, {
        httpOnly: true,
        maxAge: refreshExpiresIn * 1000,
        ...config
    });
}

export async function refresh(req: Request, res: Response) {
    const accessToken = await refreshToken(req, accessExpiresIn)
    if (!accessToken) return res.sendStatus(401)
    // Set cookies
    res.cookie(ACCESS_TOKEN_KEY, accessToken, {
        httpOnly: false, // frontend have access to it
        secure: false, // TODO: set it true on production
        sameSite: 'lax',
        maxAge: accessExpiresIn * 1000, // 15 minutes
    });


    res.sendStatus(200)
}

export async function isAuthenticated(req: Request, res: Response) {
    const logged = await isLoggedIn(req)
    if (!logged) {
        return res.sendStatus(401)
    }

    res.sendStatus(200)
}


export async function logout(req: Request, res: Response) {
    removeToken(req)
    res.clearCookie(ACCESS_TOKEN_KEY)
    res.clearCookie(REFRESH_TOKEN_KEY)
    res.json({ message: 'Logged out' })
}

export async function verifyUser(req: Request, res: Response) {
    try {
        const { username } = req.body
        const existUser = await userExist(username)
        res.json(existUser)
    } catch (error) {
        res.sendStatus(500)        
    }
}
