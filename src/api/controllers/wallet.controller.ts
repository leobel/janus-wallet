import express, { Request, Response } from 'express';
import { spendWalletFunds, generateRedeemer, buildSpendTx } from '../services/wallet.service';
import { Network } from '@lucid-evolution/lucid';


// Wallet routes
const router = express.Router();

export default (network: Network) => {
  const buildSpendFunds = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { amount, receive_address: receiveAddress, assets } = req.body;
      const result = await buildSpendTx(userId, amount, receiveAddress, network, assets);

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const spendFunds = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { redeemers, tx } = req.body;
      const txId = await spendWalletFunds(userId, redeemers, tx);

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

  // TODO: this should be done on the client side (e.g browser)
  const sign = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { pwd, tx: txCbor, size } = req.body

      const redeemers = await generateRedeemer(userId, pwd, txCbor, size)
      res.status(200).json({ redeemers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  router.post('/spend/:userId/send', spendFunds);
  router.post('/spend/:userId/build', buildSpendFunds);
  router.post('/registerAndDelegateToPool', registerAndDelegateToPool);
  router.post('/withdraw', withdraw);
  router.post('/sign/:userId', sign)


  return router;
};