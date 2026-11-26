import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission, requireRole } from '@/lib/rbac';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// In-memory persistent placement inventory configuration
const PLACEMENTS_STORE: Record<string, any> = {
  EXTENSION_POPUP: {
    id: 'EXTENSION_POPUP',
    name: 'Chrome Extension Popup Surface',
    surfaceType: 'BROWSER_EXTENSION_POPUP',
    dimensions: '380x560',
    status: 'ACTIVE',
    floorCpmRupees: 30.0,
    floorCpcRupees: 1.5,
    minDwellSeconds: 1.0,
    activeCampaignsCount: 4,
    compliancePolicy: 'Chrome Web Store Single Purpose Compliant. Zero DOM tampering.',
    lastAudited: new Date().toISOString(),
  },
  EXTENSION_SIDEPANEL: {
    id: 'EXTENSION_SIDEPANEL',
    name: 'Chrome Extension Side Panel',
    surfaceType: 'BROWSER_EXTENSION_SIDEPANEL',
    dimensions: '420x800',
    status: 'ACTIVE',
    floorCpmRupees: 45.0,
    floorCpcRupees: 2.0,
    minDwellSeconds: 1.5,
    activeCampaignsCount: 2,
    compliancePolicy: 'Native Chrome sidePanel API. Zero third-party content interception.',
    lastAudited: new Date().toISOString(),
  },
  WEB_DISCOVERY_FEED: {
    id: 'WEB_DISCOVERY_FEED',
    name: 'AdEarn Creator Discovery Wall',
    surfaceType: 'FIRST_PARTY_WEB',
    dimensions: 'Responsive Grid',
    status: 'ACTIVE',
    floorCpmRupees: 20.0,
    floorCpcRupees: 1.0,
    minDwellSeconds: 0.5,
    activeCampaignsCount: 5,
    compliancePolicy: 'First-party authenticated task exploration.',
    lastAudited: new Date().toISOString(),
  },
};

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const placements = Object.values(PLACEMENTS_STORE);
  return NextResponse.json({ placements });
}

export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ['ADMIN', 'SUPER_ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const { placementId, status, floorCpmRupees, floorCpcRupees, minDwellSeconds } = body;

  if (!placementId || !PLACEMENTS_STORE[placementId]) {
    return NextResponse.json({ error: 'Valid placement ID is required.' }, { status: 400 });
  }

  const placement = PLACEMENTS_STORE[placementId];
  const oldState = { ...placement };

  if (status && ['ACTIVE', 'PAUSED'].includes(status)) {
    placement.status = status;
  }
  if (floorCpmRupees !== undefined) {
    placement.floorCpmRupees = parseFloat(floorCpmRupees);
  }
  if (floorCpcRupees !== undefined) {
    placement.floorCpcRupees = parseFloat(floorCpcRupees);
  }
  if (minDwellSeconds !== undefined) {
    placement.minDwellSeconds = parseFloat(minDwellSeconds);
  }
  placement.lastAudited = new Date().toISOString();

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'ADMIN_PLACEMENT_CONFIG_UPDATED',
    entityType: 'Placement',
    entityId: placementId,
    oldState,
    newState: placement,
  });

  return NextResponse.json({
    success: true,
    message: `Placement ${placement.name} configuration updated.`,
    placement,
  });
}
