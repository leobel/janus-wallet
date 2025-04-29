import express, { Request, Response } from 'express';
import { spendWalletFunds, generateRedeemer, buildSpend, createAccountTx, registerAndDelegate, delegate } from '../services/wallet.service';
import { Network } from '@lucid-evolution/lucid';


// Wallet routes
const router = express.Router();

export default (network: Network) => {
  const createAccount = async (req: Request, res: Response) => {
    try {
      const { user_name } = req.params;
      const { hash, nonce } = req.body
      const result = await createAccountTx(user_name, network, hash, nonce)

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  const buildSpendFunds = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { amount, receive_address: receiveAddress, assets } = req.body;
      const result = await buildSpend(userId, amount, receiveAddress, network, assets);

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

      res.status(200).json({ tx_id: txId });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const registerAndDelegateToPool = async (req: Request, res: Response) => {
    try {
      const { userId, poolId } = req.params
      const result = await registerAndDelegate(network, userId, poolId)
      res.status(200).json(result)
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const registerToPool = async (req: Request, res: Response) => {
    try {
      // TODO: Implement stake pool registration and delegation
      res.status(501).json({ message: 'Not implemented yet' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const delegateToPool = async (req: Request, res: Response) => {
    try {
      const { userId, poolId } = req.params
      const result = await delegate(network, userId, poolId)
      res.status(200).json(result)
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
      const { pwd, tx: txCbor } = req.body

      const redeemers = await generateRedeemer(userId, pwd, txCbor)
      res.status(200).json({ redeemers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

  router.post('/:user_name', createAccount)
  router.post('/:userId/build', buildSpendFunds)
  router.post('/:userId/sign', sign)
  router.post('/:userId/send', spendFunds);
  router.post('/:userId/pools/:poolId/registerAndDelegate', registerAndDelegateToPool)
  router.post('/:userId/pools/:poolId/delegate', delegateToPool)
  router.post('/:userId/pools/:poolId/register', registerToPool)
  router.post('/:userId/withdraw', withdraw)


  return router
};