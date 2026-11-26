import prisma from './prisma';
import { DoubleEntryLedger, SYSTEM_ACCOUNTS, JournalEntrySpec } from './double-entry';

export interface PostLedgerEntryParams {
  walletId: string;
  referenceId: string;
  type: 'CREDIT_REWARD' | 'CREDIT_IMPRESSION_REWARD' | 'DEBIT_WITHDRAWAL' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'ADVERTISER_TOPUP' | 'ADMIN_ADJUSTMENT' | 'PAYOUT_REVERSAL';
  amountPaise: bigint;
  idempotencyKey: string;
  reason: string;
  metadata?: any;
  actorId?: string;
}

export class FinancialLedger {
  /**
   * Idempotently posts a transaction to the double-entry append-only general journal
   * and atomically updates the authoritative wallet balance projections.
   */
  static async postTransaction(params: PostLedgerEntryParams) {
    const { walletId, referenceId, type, amountPaise, idempotencyKey, reason, metadata, actorId } = params;

    if (amountPaise <= 0n) {
      throw new Error(`Invalid transaction amount: ${amountPaise}. Must be strictly positive BigInt paise.`);
    }

    const db: any = prisma;

    // Check existing transaction
    const existingTx = await db.ledgerTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTx) {
      return { success: true, transaction: existingTx, duplicate: true };
    }

    const wallet = await db.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      throw new Error(`Target wallet not found for ID: ${walletId}`);
    }

    // Determine balanced journal entries and projection deltas
    const entries: JournalEntrySpec[] = [];
    let availableDelta = 0n;
    let pendingDelta = 0n;
    let escrowDelta = 0n;
    let lifetimeEarnedDelta = 0n;
    let lifetimePaidDelta = 0n;

    switch (type) {
      case 'CREDIT_REWARD':
      case 'CREDIT_IMPRESSION_REWARD':
        // Debit Campaign Escrow Reserve -> Credit Creator Payable
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.CAMPAIGN_RESERVE_LIABILITY.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.CREATOR_PAYABLE_LIABILITY.code, entryType: 'CREDIT', amountPaise }
        );
        availableDelta = amountPaise;
        lifetimeEarnedDelta = amountPaise;
        break;

      case 'DEBIT_WITHDRAWAL':
        if (wallet.availablePaise < amountPaise) {
          throw new Error(`Insufficient available balance. Required: ${amountPaise}, Available: ${wallet.availablePaise}`);
        }
        // Debit Creator Payable -> Credit Nodal Bank Account Asset
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.CREATOR_PAYABLE_LIABILITY.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.NODAL_BANK_ASSET.code, entryType: 'CREDIT', amountPaise }
        );
        availableDelta = -amountPaise;
        lifetimePaidDelta = amountPaise;
        break;

      case 'ESCROW_LOCK':
        if (wallet.escrowPaise < amountPaise) {
          throw new Error(`Insufficient escrow balance to lock campaign budget. Required: ${amountPaise}, Escrow: ${wallet.escrowPaise}`);
        }
        // Debit Advertiser Escrow Liability -> Credit Campaign Reserve Liability
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.ADVERTISER_ESCROW_LIABILITY.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.CAMPAIGN_RESERVE_LIABILITY.code, entryType: 'CREDIT', amountPaise }
        );
        escrowDelta = -amountPaise;
        break;

      case 'ESCROW_RELEASE':
        // Debit Campaign Reserve Liability -> Credit Advertiser Escrow Liability
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.CAMPAIGN_RESERVE_LIABILITY.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.ADVERTISER_ESCROW_LIABILITY.code, entryType: 'CREDIT', amountPaise }
        );
        escrowDelta = amountPaise;
        break;

      case 'ADVERTISER_TOPUP':
        // Debit Nodal Bank Asset -> Credit Advertiser Escrow Liability
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.NODAL_BANK_ASSET.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.ADVERTISER_ESCROW_LIABILITY.code, entryType: 'CREDIT', amountPaise }
        );
        escrowDelta = amountPaise;
        break;

      case 'PAYOUT_REVERSAL':
        // Compensating reversal: Debit Nodal Bank Asset -> Credit Creator Payable
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.NODAL_BANK_ASSET.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.CREATOR_PAYABLE_LIABILITY.code, entryType: 'CREDIT', amountPaise }
        );
        availableDelta = amountPaise;
        lifetimePaidDelta = wallet.lifetimePaidPaise >= amountPaise ? -amountPaise : 0n;
        break;

      case 'ADMIN_ADJUSTMENT':
        entries.push(
          { accountCode: SYSTEM_ACCOUNTS.NODAL_BANK_ASSET.code, entryType: 'DEBIT', amountPaise },
          { accountCode: SYSTEM_ACCOUNTS.CREATOR_PAYABLE_LIABILITY.code, entryType: 'CREDIT', amountPaise }
        );
        availableDelta = amountPaise;
        break;

      default:
        throw new Error(`Unsupported ledger transaction type: ${type}`);
    }

    // Delegate to DoubleEntryLedger engine
    const balancedResult = await DoubleEntryLedger.postBalancedTransaction({
      referenceId,
      idempotencyKey,
      type,
      description: reason,
      actorId,
      entries,
      walletUpdates: [
        {
          walletId,
          availableDeltaPaise: availableDelta,
          pendingDeltaPaise: pendingDelta,
          escrowDeltaPaise: escrowDelta,
          lifetimeEarnedDeltaPaise: lifetimeEarnedDelta,
          lifetimePaidDeltaPaise: lifetimePaidDelta,
        },
      ],
      metadata,
    });

    const updatedWallet = await db.wallet.findUnique({ where: { id: walletId } });
    const transaction = await db.ledgerTransaction.findFirst({
      where: { idempotencyKey: `${idempotencyKey}-${walletId}` },
    });

    return {
      success: true,
      duplicate: balancedResult.duplicate,
      journalTransaction: balancedResult.journalTransaction,
      transaction: transaction || { id: referenceId, amountPaise, type, referenceId },
      updatedWallet,
    };
  }

  /**
   * Puts reward into PENDING validation state
   */
  static async recordPendingReward(walletId: string, amountPaise: bigint) {
    const db: any = prisma;
    return await db.wallet.update({
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
    const db: any = prisma;
    const wallet = await db.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new Error('Wallet not found');

    const deductPending = wallet.pendingPaise >= amountPaise ? amountPaise : wallet.pendingPaise;

    return await this.postTransaction({
      walletId,
      referenceId,
      type: 'CREDIT_REWARD',
      amountPaise,
      idempotencyKey,
      reason: 'Verified campaign task completion reward approved',
    });
  }
}
