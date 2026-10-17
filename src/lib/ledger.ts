import prisma from './prisma';
import { recordAuditLog } from './audit';
import crypto from 'crypto';

export interface PostLedgerEntryParams {
  walletId: string;
  referenceId: string;
  type: 'CREDIT_REWARD' | 'DEBIT_WITHDRAWAL' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'ADVERTISER_TOPUP' | 'ADMIN_ADJUSTMENT';
  amountPaise: bigint;
  idempotencyKey: string;
  reason: string;
  metadata?: any;
  actorId?: string;
}

export class FinancialLedger {
  /**
   * Idempotently posts a transaction to the double-entry append-only ledger and updates the authoritative wallet balances.
   */
  static async postTransaction(params: PostLedgerEntryParams) {
    const { walletId, referenceId, type, amountPaise, idempotencyKey, reason, metadata, actorId } = params;

    // 1. Idempotency Check: Return existing transaction if already posted
    const existingTx = await prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTx) {
      return { success: true, transaction: existingTx, duplicate: true };
    }

    // 2. Perform ACID atomic transaction
    return await prisma.$transaction(async (tx) => {
      // Find wallet
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
      });
      if (!wallet) {
        throw new Error(`Wallet not found for ID: ${walletId}`);
      }

      let newAvailable = wallet.availablePaise;
      let newPending = wallet.pendingPaise;
      let newEscrow = wallet.escrowPaise;
      let newLifetimeEarned = wallet.lifetimeEarnedPaise;
      let newLifetimePaid = wallet.lifetimePaidPaise;

      switch (type) {
        case 'CREDIT_REWARD':
          // Transfer from pending or direct credit to available
          newAvailable = newAvailable + amountPaise;
          newLifetimeEarned = newLifetimeEarned + amountPaise;
          break;

        case 'DEBIT_WITHDRAWAL':
          if (newAvailable < amountPaise) {
            throw new Error(`Insufficient available balance. Required: ${amountPaise}, Available: ${newAvailable}`);
          }
          newAvailable = newAvailable - amountPaise;
          newLifetimePaid = newLifetimePaid + amountPaise;
          break;

        case 'ESCROW_LOCK':
          if (newEscrow < amountPaise) {
            throw new Error(`Insufficient escrow balance to allocate campaign budget. Required: ${amountPaise}, Escrow: ${newEscrow}`);
          }
          // Reserved/locked budget
          newEscrow = newEscrow - amountPaise;
          break;

        case 'ESCROW_RELEASE':
          newEscrow = newEscrow + amountPaise;
          break;

        case 'ADVERTISER_TOPUP':
          newEscrow = newEscrow + amountPaise;
          break;

        case 'ADMIN_ADJUSTMENT':
          newAvailable = newAvailable + amountPaise;
          if (newAvailable < BigInt(0)) {
            throw new Error(`Adjustment would result in negative available balance.`);
          }
          break;

        default:
          throw new Error(`Unsupported ledger transaction type: ${type}`);
      }

      // Update wallet atomically
      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          availablePaise: newAvailable,
          pendingPaise: newPending,
          escrowPaise: newEscrow,
          lifetimeEarnedPaise: newLifetimeEarned,
          lifetimePaidPaise: newLifetimePaid,
        },
      });

      // Write immutable append-only ledger transaction
      const transaction = await tx.ledgerTransaction.create({
        data: {
          referenceId,
          walletId,
          type,
          amountPaise,
          balanceAfterPaise: newAvailable,
          idempotencyKey,
          reason,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      return { success: true, transaction, updatedWallet, duplicate: false };
    });
  }

  /**
   * Puts reward into PENDING validation state
   */
  static async recordPendingReward(walletId: string, amountPaise: bigint) {
    return await prisma.wallet.update({
      where: { id: walletId },
      data: {
        pendingPaise: {
          increment: amountPaise,
        },
      },
    });
  }

  /**
   * Approves pending reward into available balance
   */
  static async approvePendingReward(walletId: string, referenceId: string, amountPaise: bigint, idempotencyKey: string) {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new Error('Wallet not found');

      const deductPending = wallet.pendingPaise >= amountPaise ? amountPaise : wallet.pendingPaise;

      await tx.wallet.update({
        where: { id: walletId },
        data: {
          pendingPaise: { decrement: deductPending },
          availablePaise: { increment: amountPaise },
          lifetimeEarnedPaise: { increment: amountPaise },
        },
      });

      return await tx.ledgerTransaction.create({
        data: {
          referenceId,
          walletId,
          type: 'CREDIT_REWARD',
          amountPaise,
          balanceAfterPaise: wallet.availablePaise + amountPaise,
          idempotencyKey,
          reason: 'Verified campaign task completion reward approved',
        },
      });
    });
  }
}
