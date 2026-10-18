import crypto from 'crypto';

const SIGNING_KEY = process.env.TELEMETRY_SIGNING_KEY || 'telemetry-integrity-key-adearn-ai-prod-2026';

export interface TelemetryPayload {
  sessionToken: string;
  dwellTimeSeconds: number;
  interactionCount: number;
  mouseEventsRecorded: number;
  scrollDepthPercent: number;
  viewportWidth: number;
  viewportHeight: number;
  userResponses?: Record<string, any>;
  timestamp: number;
}

export interface VerificationVerdict {
  isValid: boolean;
  anomalyScore: number; // 0.0 (clean) to 1.0 (fraudulent)
  reasons: string[];
  digest: string;
}

export function generateSessionToken(userId: string, campaignId: string): string {
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${userId}:${campaignId}:${Date.now()}:${nonce}`;
  const signature = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; campaignId: string; timestamp: number } | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');
    if (signature !== expectedSig) return null;

    const [userId, campaignId, timestampStr] = payload.split(':');
    return {
      userId,
      campaignId,
      timestamp: parseInt(timestampStr, 10),
    };
  } catch {
    return null;
  }
}

export function evaluateTaskTelemetry(
  payload: TelemetryPayload,
  minRequiredDwellSeconds: number = 30
): VerificationVerdict {
  const reasons: string[] = [];
  let anomalyScore = 0.0;

  // 1. Dwell time check
  if (payload.dwellTimeSeconds < minRequiredDwellSeconds) {
    anomalyScore += 0.45;
    reasons.push(`Insufficient engagement time: ${payload.dwellTimeSeconds}s (Required: >=${minRequiredDwellSeconds}s)`);
  }

  // 2. Automated macro / Zero interaction check
  if (payload.interactionCount < 1 && payload.mouseEventsRecorded < 3) {
    anomalyScore += 0.4;
    reasons.push('Kinematic activity absent: No voluntary mouse trajectory or touch inputs recorded');
  }

  // 3. Instantaneous click bot / unnatural speed check
  if (payload.dwellTimeSeconds < 5 && payload.interactionCount > 10) {
    anomalyScore += 0.6;
    reasons.push('Unnatural input velocity: Excessive event cadence within sub-5-second window');
  }

  // 4. Timestamp freshness (reject replay older than 2 hours)
  const ageSeconds = (Date.now() - payload.timestamp) / 1000;
  if (ageSeconds > 7200 || ageSeconds < -60) {
    anomalyScore += 0.5;
    reasons.push('Stale or anomalous task timestamp');
  }

  const isValid = anomalyScore < 0.5;
  const digest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

  return {
    isValid,
    anomalyScore: Math.min(1.0, Math.round(anomalyScore * 100) / 100),
    reasons,
    digest,
  };
}
