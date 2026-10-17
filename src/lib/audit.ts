import prisma from './prisma';
import crypto from 'crypto';

export interface AuditParams {
  actorId?: string | null;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldState?: any;
  newState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(params: AuditParams): Promise<void> {
  try {
    const oldStateJson = params.oldState ? JSON.stringify(params.oldState) : null;
    const newStateJson = params.newState ? JSON.stringify(params.newState) : null;

    // Cryptographic hash linking the event payload for tamper evidence
    const hashData = `${params.actorId || 'SYSTEM'}|${params.action}|${params.entityType}|${params.entityId}|${oldStateJson}|${newStateJson}|${Date.now()}`;
    const cryptographicHash = crypto.createHash('sha256').update(hashData).digest('hex');

    await prisma.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorRole: params.actorRole || 'SYSTEM',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldStateJson,
        newStateJson,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        cryptographicHash,
      },
    });
  } catch (err) {
    console.error('Failed to write immutable audit log:', err);
  }
}
