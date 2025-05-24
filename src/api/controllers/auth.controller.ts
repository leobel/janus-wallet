import { Request, Response } from 'express';
import { ACCESS_TOKEN_KEY, generateAccessToken, generateRefreshToken, getUserByCredentials, REFRESH_TOKEN_KEY, refreshToken } from '../services/auth.service';
import { Network } from '@lucid-evolution/lucid';
import { createAccountTx } from '../services/wallet.service';


export function register(network: Network) {
    return async (req: Request, res: Response) => {
        try {
          const { user_name } = req.params;
          const { hash, kdf_hash: kdfHash, nonce } = req.body
          const result = await createAccountTx(user_name, network, hash, kdfHash, nonce)
    
          res.status(200).json(result);
        } catch (error: any) {
          res.status(500).json({ success: false, error: error.message });
        }
    }
}

const accessExpiresIn = 15 * 60
const refreshExpiresIn = 7 * 24 * 60 * 60

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    const user = await getUserByCredentials(username, password)
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' })
    }
    const data = {
        id: user.id,
        username: user.token_name,
        address: user.spend_address,
    }
    
    const accessToken = generateAccessToken(data, accessExpiresIn);
    const refreshToken = generateRefreshToken(data, refreshExpiresIn);

    // Set cookies
    res.cookie(ACCESS_TOKEN_KEY, accessToken, {
        httpOnly: false, // frontend have access to it
        secure: true,
        sameSite: 'strict',
        maxAge: accessExpiresIn * 1000, // 15 minutes
    });
    res.cookie(REFRESH_TOKEN_KEY, refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: refreshExpiresIn * 1000, // 7 days
    });

    res.status(200).json({ message: 'Logged in' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function refresh(req: Request, res: Response) {
    const accessToken = await refreshToken(req, accessExpiresIn)
    if (!accessToken) return res.sendStatus(401)
    // Set cookies
    res.cookie(ACCESS_TOKEN_KEY, accessToken, {
        httpOnly: false, // frontend have access to it
        secure: true,
        sameSite: 'strict',
        maxAge: accessExpiresIn * 1000, // 15 minutes
    });
    
    
    res.sendStatus(200)
}
