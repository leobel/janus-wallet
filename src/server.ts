import 'dotenv/config';
import express, { Request, Response, RequestHandler } from 'express';
import walletRouter from './api/controllers/wallet.controller';
import circuitRouter from './api/controllers/circuit.controller';
import { Network } from '@lucid-evolution/lucid';
import { login, refresh, register } from './api/controllers/auth.controller';
import cookieParser from 'cookie-parser';

const app = express();
const port = process.env.PORT || 3000;

const network = process.env.CARDANO_NETWORK as Network;

// Middleware
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.post('/login', login as RequestHandler)
app.post('/register', register(network) as RequestHandler)
app.get('/refreshToken', refresh as RequestHandler)

app.use('/wallets', walletRouter(network));
app.use('/circuits', circuitRouter(network))

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 