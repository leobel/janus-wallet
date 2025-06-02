import 'dotenv/config';
import express, { Request, Response, RequestHandler } from 'express';
import walletRouter from './api/controllers/wallet.controller';
import circuitRouter from './api/controllers/circuit.controller';
import { Network } from '@lucid-evolution/lucid';
import { isAuthenticated, login, logout, refresh, createAccount, verifyUser } from './api/controllers/auth.controller';
import cookieParser from 'cookie-parser';
import cors from 'cors'
import { authenticateToken } from './api/services/auth.service';
import { listStakePools } from './api/controllers/stake.controller';

const app = express();
const port = process.env.PORT || 3000;

const network = process.env.CARDANO_NETWORK as Network;

app.set('trust proxy', 1);

// Allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").filter(url => url) || [];

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}))
app.use(express.json());
app.use(cookieParser());

// Add this before your routes
app.use((req, res, next) => {
    console.log('Request origin:', req.headers.origin);
    console.log('Request cookies:', req.cookies);
    next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.post('/login', login as RequestHandler)
app.get('/logout', logout as RequestHandler)
app.post('/register', createAccount(network) as RequestHandler)
app.get('/refreshToken', refresh as RequestHandler)
app.get('/auth/me', isAuthenticated as RequestHandler)
app.post('/userExist', verifyUser as RequestHandler)

app.use('/wallets', authenticateToken as RequestHandler, walletRouter(network))
app.use('/stakePools', authenticateToken as RequestHandler, listStakePools)
app.use('/circuits', circuitRouter(network))

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 