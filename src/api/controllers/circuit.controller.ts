import express, { Request, Response } from 'express';
import { mintCircuit } from '../services/circuit.service';
import { Network } from '@lucid-evolution/lucid';


// Admin routes
const router = express.Router();

export default (network: Network) => {
  const createCircuit = async (req: Request, res: Response) => {
    try {
      const { token_name, verification_key, version, nonce } = req.body;
      const result = await mintCircuit(network, token_name, verification_key, version, nonce)

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  router.post('/', createCircuit);


  return router;
};