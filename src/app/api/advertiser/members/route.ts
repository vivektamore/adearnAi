import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let orgId = auth.session!.organizationId;
  if (!orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: auth.session!.userId },
    });
    orgId = userOrg?.organizationId || null;
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      users: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              kycTier: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const members = organization.users.map((uo) => ({
    id: uo.id,
    userId: uo.user.id,
    name: uo.user.name,
    email: uo.user.email,
    orgRole: uo.role,
    systemRole: uo.user.role,
    status: uo.user.status,
    kycTier: uo.user.kycTier,
    joinedAt: uo.user.createdAt,
  }));

  return NextResponse.json({
    organization: {
      id: organization.id,
      name: organization.name,
      contactEmail: organization.contactEmail,
      isVerified: organization.isVerified,
    },
    members,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let orgId = auth.session!.organizationId;
  if (!orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: auth.session!.userId },
    });
    orgId = userOrg?.organizationId || null;
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const body = await req.json();
  const { email, role = 'MEMBER' } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Valid user email is required.' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return NextResponse.json({
      error: `No registered user found with email "${normalizedEmail}". Team members must create an AdEarn AI account first.`,
    }, { status: 404 });
  }

  // Check if already in this organization
  const existingMembership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: orgId,
      },
    },
  });

  if (existingMembership) {
    return NextResponse.json({ error: 'User is already a member of this organization.' }, { status: 400 });
  }

  // Create membership
  const membership = await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: orgId,
      role: role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'MEMBER',
    },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'ORGANIZATION_MEMBER_INVITED',
    entityType: 'UserOrganization',
    entityId: membership.id,
    newState: { addedEmail: normalizedEmail, assignedRole: role },
  });

  return NextResponse.json({
    success: true,
    message: `User ${normalizedEmail} successfully added to organization as ${role}.`,
    membership,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req, ['ADVERTISER', 'ADMIN', 'SUPER_ADMIN']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let orgId = auth.session!.organizationId;
  if (!orgId) {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: auth.session!.userId },
    });
    orgId = userOrg?.organizationId || null;
  }

  if (!orgId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const membershipId = searchParams.get('id');

  if (!membershipId) {
    return NextResponse.json({ error: 'Membership ID is required.' }, { status: 400 });
  }

  const targetMembership = await prisma.userOrganization.findUnique({
    where: { id: membershipId },
  });

  if (!targetMembership || targetMembership.organizationId !== orgId) {
    return NextResponse.json({ error: 'Membership record not found in your organization.' }, { status: 404 });
  }

  if (targetMembership.userId === auth.session!.userId && targetMembership.role === 'OWNER') {
    return NextResponse.json({ error: 'Organization Owner cannot remove their own primary membership.' }, { status: 400 });
  }

  await prisma.userOrganization.delete({
    where: { id: membershipId },
  });

  await recordAuditLog({
    actorId: auth.session!.userId,
    actorRole: auth.session!.role,
    action: 'ORGANIZATION_MEMBER_REMOVED',
    entityType: 'UserOrganization',
    entityId: membershipId,
    newState: { removedUserId: targetMembership.userId },
  });

  return NextResponse.json({ success: true, message: 'Member successfully removed.' });
}
