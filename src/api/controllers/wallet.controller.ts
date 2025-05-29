import express, { Request, RequestHandler, Response } from 'express';
import { spendWalletFunds, generateRedeemer, buildSpend, registerAndDelegate, delegate, delegateDrep, withdrawRewards, getWalletAccount, mintAccountTx } from '../services/wallet.service';
import { Network } from '@lucid-evolution/lucid';
import { circuitHashTest } from '../../zkproof';
import { authenticateToken } from '../services/auth.service';


// Wallet routes
const router = express.Router();

export default (network: Network) => {
  const submitAccountTx = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { cbor_tx, vk_witnesses } = req.body
      const result = await mintAccountTx(userId, cbor_tx, vk_witnesses)
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

  const delegateToDrep = async (req: Request, res: Response) => {
    try {
      const { userId, drepId } = req.params
      const { drep_type } = req.body
      const result = await delegateDrep(network, userId, { type: drep_type, hash: drepId })
      res.status(200).json(result)
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const withdraw = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const { amount } = req.body
      const result = await withdrawRewards(network, userId, amount)
      res.status(200).json(result)
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  const getAccountBalance = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params

      const account = await getWalletAccount(userId)
      res.status(200).json(account);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }

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

  router.post('/:userId/mintAccount', submitAccountTx)
  router.get('/:userId/balance', getAccountBalance)
  router.post('/:userId/build', buildSpendFunds)
  router.post('/:userId/pools/:poolId/registerAndDelegate', registerAndDelegateToPool)
  router.post('/:userId/pools/:poolId/delegate', delegateToPool)
  router.post('/:userId/pools/:poolId/register', registerToPool)
  router.post('/:userId/dreps/:drepId/delegate', delegateToDrep)
  router.post('/:userId/withdraw', withdraw)
  router.post('/:userId/sign', sign)
  router.post('/:userId/send', spendFunds)

  return router
};