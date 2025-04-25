import 'dotenv/config';
import express, { Request, Response } from 'express';
import walletRouter from './api/controllers/wallet.controller';
import circuitRouter from './api/controllers/circuit.controller';
import { Network } from '@lucid-evolution/lucid';

const app = express();
const port = process.env.PORT || 3000;

const network = process.env.CARDANO_NETWORK as Network;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.use('/wallets', walletRouter(network));
app.use('/circuits', circuitRouter(network))

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 