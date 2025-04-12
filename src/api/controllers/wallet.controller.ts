import express, { Request, Response } from 'express';
import { spendWalletFunds } from '../services/wallet.service';
import { LucidEvolution, Network } from '@lucid-evolution/lucid';


// Wallet routes
const router = express.Router();

export default (network: Network) => {

  const spendFunds = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { amount } = req.body;
      const { receiveAddress } = req.body;
      const { assets } = req.body;
      const txId = await spendWalletFunds(userId, amount, receiveAddress, network, assets);

      res.status(200).json({ txId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const registerAndDelegateToPool = async (req: Request, res: Response) => {
    try {
      // TODO: Implement stake pool registration and delegation
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const withdraw = async (req: Request, res: Response) => {
    try {
      // TODO: Implement withdrawal functionality
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }; 

  router.post('/spend/:userId', spendFunds);
  router.post('/registerAndDelegateToPool', registerAndDelegateToPool);
  router.post('/withdraw', withdraw);


  return router;
};