/**
 * ADEARN AI — PORTAL SEPARATION, RBAC, IDOR & ACCESS CONTROL TEST SUITE
 * Validates strict separation of User, Brand, and Admin portals,
 * complete removal of switch-portal backdoor, multi-tenant IDOR protection,
 * and server-enforced role authorization.
 */

const assert = require('assert');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'adearn-ai-development-super-secret-jwt-key-2026-minimum-32-chars-long';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runPortalRbacSeparationTests() {
  console.log('================================================================');
  console.log('🛡️  ADEARN AI PORTAL SEPARATION, RBAC & IDOR SECURITY SUITE');
  console.log('Testing against Live Local Server & Live MySQL 8.0');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(msg) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  }

  function recordFail(msg, err) {
    console.error(`  ❌ FAIL: ${msg}`);
    if (err) console.error(err);
    failed++;
  }

  // Generate ephemeral test entities
  const ts = Date.now();
  const testUsers = {
    creatorA: {
      id: `usr_test_creator_a_${ts}`,
      email: `creator_a_${ts}@test.in`,
      name: 'Creator Alpha',
      role: 'USER',
    },
    creatorB: {
      id: `usr_test_creator_b_${ts}`,
      email: `creator_b_${ts}@test.in`,
      name: 'Creator Beta',
      role: 'USER',
    },
    brandA: {
      id: `usr_test_brand_a_${ts}`,
      email: `brand_a_${ts}@test.in`,
      name: 'Brand Alpha Exec',
      role: 'ADVERTISER',
      orgId: `org_test_a_${ts}`,
    },
    brandB: {
      id: `usr_test_brand_b_${ts}`,
      email: `brand_b_${ts}@test.in`,
      name: 'Brand Beta Exec',
      role: 'ADVERTISER',
      orgId: `org_test_b_${ts}`,
    },
    adminOps: {
      id: `usr_test_admin_ops_${ts}`,
      email: `admin_ops_${ts}@adearn.ai`,
      name: 'Ops Admin',
      role: 'ADMIN',
    },
    superAdmin: {
      id: `usr_test_super_admin_${ts}`,
      email: `super_admin_${ts}@adearn.ai`,
      name: 'Platform Super Admin',
      role: 'SUPER_ADMIN',
    },
  };

  let campaignAId = null;
  let campaignBId = null;
  let userBTaskId = null;

  try {
    // 0. Seed test fixtures in MySQL
    console.log('[PHASE 0] Provisioning Isolated Multi-Tenant Test Fixtures...');
    
    // Create Creator A & B
    await prisma.user.create({
      data: {
        id: testUsers.creatorA.id,
        email: testUsers.creatorA.email,
        name: testUsers.creatorA.name,
        role: 'USER',
        passwordHash: '$2a$10$dummyhashforisolationtestingonly1234567890',
        wallet: { create: { availablePaise: BigInt(50000) } },
      },
    });

    await prisma.user.create({
      data: {
        id: testUsers.creatorB.id,
        email: testUsers.creatorB.email,
        name: testUsers.creatorB.name,
        role: 'USER',
        passwordHash: '$2a$10$dummyhashforisolationtestingonly1234567890',
        wallet: { create: { availablePaise: BigInt(25000) } },
      },
    });

    // Create Organization A & Brand User A
    const orgA = await prisma.organization.create({
      data: {
        id: testUsers.brandA.orgId,
        name: 'Brand Alpha Pvt Ltd',
        contactEmail: testUsers.brandA.email,
        gstin: '29ABCDE1234F1Z5',
        isVerified: true,
        wallet: { create: { escrowPaise: BigInt(1000000) } },
      },
    });

    await prisma.user.create({
      data: {
        id: testUsers.brandA.id,
        email: testUsers.brandA.email,
        name: testUsers.brandA.name,
        role: 'ADVERTISER',
        passwordHash: '$2a$10$dummyhashforisolationtestingonly1234567890',
        userOrganizations: {
          create: { organizationId: orgA.id, role: 'OWNER' },
        },
      },
    });

    // Create Organization B & Brand User B
    const orgB = await prisma.organization.create({
      data: {
        id: testUsers.brandB.orgId,
        name: 'Brand Beta Solutions Ltd',
        contactEmail: testUsers.brandB.email,
        gstin: '27XYZAB9876C1Z3',
        isVerified: true,
        wallet: { create: { escrowPaise: BigInt(2000000) } },
      },
    });

    await prisma.user.create({
      data: {
        id: testUsers.brandB.id,
        email: testUsers.brandB.email,
        name: testUsers.brandB.name,
        role: 'ADVERTISER',
        passwordHash: '$2a$10$dummyhashforisolationtestingonly1234567890',
        userOrganizations: {
          create: { organizationId: orgB.id, role: 'OWNER' },
        },
      },
    });

    // Create Campaigns for Brand A and Brand B
    const campA = await prisma.campaign.create({
      data: {
        organizationId: orgA.id,
        title: 'Brand Alpha FinTech App Launch',
        description: 'Verify digital account opening',
        category: 'FinTech',
        actionType: 'SURVEY',
        targetUrl: 'https://alpha.example.com',
        budgetAllocatedPaise: BigInt(50000),
        costPerOutcomePaise: BigInt(2500),
        targetOutcomes: 20,
        status: 'ACTIVE',
      },
    });
    campaignAId = campA.id;

    const campB = await prisma.campaign.create({
      data: {
        organizationId: orgB.id,
        title: 'Brand Beta Cloud SaaS Survey',
        description: 'Review developer cloud tooling',
        category: 'Enterprise SaaS',
        actionType: 'SURVEY',
        targetUrl: 'https://beta.example.com',
        budgetAllocatedPaise: BigInt(80000),
        costPerOutcomePaise: BigInt(4000),
        targetOutcomes: 20,
        status: 'ACTIVE',
      },
    });
    campaignBId = campB.id;

    // Create a task for User B under Campaign B
    const taskB = await prisma.userTask.create({
      data: {
        userId: testUsers.creatorB.id,
        campaignId: campB.id,
        sessionToken: `test_session_token_b_${ts}`,
        status: 'VALIDATED',
        rewardPaise: BigInt(4000),
        startedAt: new Date(),
        submittedAt: new Date(),
      },
    });
    userBTaskId = taskB.id;

    console.log('  ✓ Test fixtures provisioned successfully.\n');

    // Tokens for each actor
    const tokens = {
      creatorA: makeToken({ userId: testUsers.creatorA.id, email: testUsers.creatorA.email, name: testUsers.creatorA.name, role: 'USER' }),
      creatorB: makeToken({ userId: testUsers.creatorB.id, email: testUsers.creatorB.email, name: testUsers.creatorB.name, role: 'USER' }),
      brandA: makeToken({ userId: testUsers.brandA.id, email: testUsers.brandA.email, name: testUsers.brandA.name, role: 'ADVERTISER', organizationId: testUsers.brandA.orgId }),
      brandB: makeToken({ userId: testUsers.brandB.id, email: testUsers.brandB.email, name: testUsers.brandB.name, role: 'ADVERTISER', organizationId: testUsers.brandB.orgId }),
      adminOps: makeToken({ userId: testUsers.adminOps.id, email: testUsers.adminOps.email, name: testUsers.adminOps.name, role: 'ADMIN' }),
      superAdmin: makeToken({ userId: testUsers.superAdmin.id, email: testUsers.superAdmin.email, name: testUsers.superAdmin.name, role: 'SUPER_ADMIN' }),
    };

    // =========================================================================
    // SECTION 1: BACKDOOR DELETION & ZERO CASUAL ESCALATION
    // =========================================================================
    console.log('--- [SECTION 1] Backdoor Elimination Verification ---');

    try {
      const res = await fetch(`${BASE_URL}/api/auth/switch-portal?to=admin`);
      if (res.status === 404) {
        recordPass('1.1 Backdoor /api/auth/switch-portal completely removed (HTTP 404)');
      } else {
        recordFail(`1.1 Backdoor returned status ${res.status}, expected 404`);
      }
    } catch (err) {
      recordFail('1.1 Failed to test backdoor', err);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/auth/switch-portal?to=advertiser`);
      if (res.status === 404) {
        recordPass('1.2 Backdoor /api/auth/switch-portal?to=advertiser returns HTTP 404');
      } else {
        recordFail(`1.2 Backdoor returned status ${res.status}, expected 404`);
      }
    } catch (err) {
      recordFail('1.2 Failed to test backdoor', err);
    }

    // =========================================================================
    // SECTION 2: STRICT PORTAL & API ROUTE ISOLATION
    // =========================================================================
    console.log('\n--- [SECTION 2] Strict Cross-Portal Route Isolation ---');

    // 2.1: Creator (USER) attempting to access Admin endpoints -> 403
    try {
      const res = await fetch(`${BASE_URL}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${tokens.creatorA}` },
      });
      if (res.status === 403) {
        recordPass('2.1.1 Creator accessing /api/admin/overview rejected with HTTP 403');
      } else {
        recordFail(`2.1.1 Creator accessing /api/admin/overview returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.1.1 Error', err);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/admin/moderation`, {
        headers: { Authorization: `Bearer ${tokens.creatorA}` },
      });
      if (res.status === 403) {
        recordPass('2.1.2 Creator accessing /api/admin/moderation rejected with HTTP 403');
      } else {
        recordFail(`2.1.2 Creator accessing /api/admin/moderation returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.1.2 Error', err);
    }

    // 2.2: Creator (USER) attempting to access Advertiser endpoints -> 403
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
        headers: { Authorization: `Bearer ${tokens.creatorA}` },
      });
      if (res.status === 403) {
        recordPass('2.2.1 Creator accessing /api/advertiser/campaigns rejected with HTTP 403');
      } else {
        recordFail(`2.2.1 Creator accessing /api/advertiser/campaigns returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.2.1 Error', err);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/billing`, {
        headers: { Authorization: `Bearer ${tokens.creatorA}` },
      });
      if (res.status === 403) {
        recordPass('2.2.2 Creator accessing /api/advertiser/billing rejected with HTTP 403');
      } else {
        recordFail(`2.2.2 Creator accessing /api/advertiser/billing returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.2.2 Error', err);
    }

    // 2.3: Brand (ADVERTISER) attempting to access Admin endpoints -> 403
    try {
      const res = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${tokens.brandA}` },
      });
      if (res.status === 403) {
        recordPass('2.3.1 Brand accessing /api/admin/audit-logs rejected with HTTP 403');
      } else {
        recordFail(`2.3.1 Brand accessing /api/admin/audit-logs returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.3.1 Error', err);
    }

    // 2.4: Brand (ADVERTISER) attempting to access Creator endpoints -> 403
    try {
      const res = await fetch(`${BASE_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${tokens.brandA}` },
      });
      if (res.status === 403) {
        recordPass('2.4.1 Brand accessing /api/wallet rejected with HTTP 403');
      } else {
        recordFail(`2.4.1 Brand accessing /api/wallet returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.4.1 Error', err);
    }

    try {
      const res = await fetch(`${BASE_URL}/api/payouts`, {
        headers: { Authorization: `Bearer ${tokens.brandA}` },
      });
      if (res.status === 403) {
        recordPass('2.4.2 Brand accessing /api/payouts rejected with HTTP 403');
      } else {
        recordFail(`2.4.2 Brand accessing /api/payouts returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('2.4.2 Error', err);
    }

    // 2.5: Admin attempting to access brand-specific campaign creation without org -> rejected
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.adminOps}`,
        },
        body: JSON.stringify({
          title: 'Admin Illegal Campaign',
          description: 'Testing Admin org boundary',
          targetUrl: 'https://admin.test',
          budgetAllocatedRupees: 1000,
          costPerOutcomeRupees: 50,
        }),
      });
      if (res.status === 400 || res.status === 403) {
        recordPass(`2.5 Admin without organization cannot create brand campaigns (HTTP ${res.status})`);
      } else {
        recordFail(`2.5 Admin campaign creation returned status ${res.status}, expected 400 or 403`);
      }
    } catch (err) {
      recordFail('2.5 Error', err);
    }

    // =========================================================================
    // SECTION 3: MULTI-TENANT BRAND IDOR DEFENSE
    // =========================================================================
    console.log('\n--- [SECTION 3] Multi-Tenant Brand IDOR Defense ---');

    // 3.1: Brand A reading its own campaign -> 200 OK
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignAId}`, {
        headers: { Authorization: `Bearer ${tokens.brandA}` },
      });
      if (res.status === 200) {
        const data = await res.json();
        assert(data.campaign && data.campaign.id === campaignAId);
        recordPass('3.1 Brand A successfully reads its own campaign (HTTP 200)');
      } else {
        recordFail(`3.1 Brand A read own campaign returned ${res.status}, expected 200`);
      }
    } catch (err) {
      recordFail('3.1 Error', err);
    }

    // 3.2: Brand A reading Brand B's campaign -> 403 Forbidden (IDOR BLOCKED)
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignBId}`, {
        headers: { Authorization: `Bearer ${tokens.brandA}` },
      });
      if (res.status === 403) {
        const data = await res.json();
        assert(data.error && data.error.includes('Forbidden'));
        recordPass('3.2 IDOR Defense: Brand A blocked from reading Brand B campaign (HTTP 403)');
      } else {
        recordFail(`3.2 Brand A reading Brand B campaign returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('3.2 Error', err);
    }

    // 3.3: Brand A attempting to mutate Brand B's campaign status -> 403 Forbidden (IDOR BLOCKED)
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignBId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.brandA}`,
        },
        body: JSON.stringify({ status: 'PAUSED' }),
      });
      if (res.status === 403) {
        // Confirm status in DB remains ACTIVE
        const check = await prisma.campaign.findUnique({ where: { id: campaignBId } });
        assert(check.status === 'ACTIVE');
        recordPass('3.3 IDOR Defense: Brand A blocked from modifying Brand B campaign (HTTP 403; status preserved)');
      } else {
        recordFail(`3.3 Brand A updating Brand B campaign returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('3.3 Error', err);
    }

    // 3.4: Brand B reading Brand A's campaign -> 403 Forbidden (symmetric isolation)
    try {
      const res = await fetch(`${BASE_URL}/api/advertiser/campaigns/${campaignAId}`, {
        headers: { Authorization: `Bearer ${tokens.brandB}` },
      });
      if (res.status === 403) {
        recordPass('3.4 IDOR Defense: Brand B symmetrically blocked from reading Brand A campaign (HTTP 403)');
      } else {
        recordFail(`3.4 Brand B reading Brand A campaign returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('3.4 Error', err);
    }

    // 3.5: Brand without Organization calling /api/advertiser/analytics -> rejected, zero data leakage
    try {
      const brandNoOrgToken = makeToken({
        userId: 'usr_no_org',
        email: 'noorg@brand.com',
        name: 'No Org User',
        role: 'ADVERTISER',
      });
      const res = await fetch(`${BASE_URL}/api/advertiser/analytics`, {
        headers: { Authorization: `Bearer ${brandNoOrgToken}` },
      });
      if (res.status === 400 || res.status === 403) {
        recordPass(`3.5 Tenant Defense: Unlinked advertiser calling analytics rejected (HTTP ${res.status})`);
      } else {
        recordFail(`3.5 Unlinked advertiser analytics returned ${res.status}, expected 400 or 403`);
      }
    } catch (err) {
      recordFail('3.5 Error', err);
    }

    // =========================================================================
    // SECTION 4: CREATOR RESOURCE IDOR DEFENSE
    // =========================================================================
    console.log('\n--- [SECTION 4] Creator Resource IDOR Defense ---');

    // 4.1: Creator A filing dispute referencing Creator B's task -> 403 Forbidden
    try {
      const res = await fetch(`${BASE_URL}/api/disputes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.creatorA}`,
        },
        body: JSON.stringify({
          subject: 'Unauthorized Task Dispute',
          description: 'Attempting to claim reward on task belonging to Creator B',
          userTaskId: userBTaskId,
        }),
      });
      if (res.status === 403) {
        recordPass('4.1 IDOR Defense: Creator A blocked from filing dispute on Creator B task (HTTP 403)');
      } else {
        recordFail(`4.1 Creator A dispute on Creator B task returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('4.1 Error', err);
    }

    // =========================================================================
    // SECTION 5: PRIVILEGE ESCALATION & REGISTRATION GUARDRAILS
    // =========================================================================
    console.log('\n--- [SECTION 5] Privilege Escalation & Registration Guardrails ---');

    // 5.1: Public registration requesting role: 'ADMIN' -> forced to 'USER'
    try {
      const rogueEmail = `rogue_admin_${ts}@test.in`;
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: rogueEmail,
          password: 'RoguePassword123!',
          name: 'Rogue Attacker',
          role: 'ADMIN',
        }),
      });
      assert(res.ok);
      const data = await res.json();
      assert(data.user.role === 'USER', 'Role must be forced to USER');

      // Verify in MySQL
      const dbUser = await prisma.user.findUnique({ where: { email: rogueEmail } });
      assert(dbUser.role === 'USER');
      recordPass("5.1 Public registration with role: 'ADMIN' safely forced to 'USER' in MySQL");

      // Cleanup
      await prisma.wallet.deleteMany({ where: { userId: dbUser.id } });
      await prisma.user.delete({ where: { id: dbUser.id } });
    } catch (err) {
      recordFail('5.1 Error', err);
    }

    // 5.2: Header Spoofing Defense: Client sends spoofed x-user-role: ADMIN
    try {
      const res = await fetch(`${BASE_URL}/api/admin/overview`, {
        headers: {
          Authorization: `Bearer ${tokens.creatorA}`,
          'x-user-role': 'ADMIN',
          'x-user-id': testUsers.adminOps.id,
        },
      });
      if (res.status === 403) {
        recordPass('5.2 Header Spoofing Defense: Spoofed x-user-role: ADMIN header stripped and rejected (HTTP 403)');
      } else {
        recordFail(`5.2 Spoofed header returned status ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('5.2 Error', err);
    }

    // =========================================================================
    // SECTION 6: GRANULAR ADMIN PERMISSIONS & LEAST PRIVILEGE
    // =========================================================================
    console.log('\n--- [SECTION 6] Granular Admin Permissions & Least Privilege ---');

    // 6.1: Admin with campaigns.moderate can view admin moderation campaigns
    try {
      const res = await fetch(`${BASE_URL}/api/admin/moderation`, {
        headers: { Authorization: `Bearer ${tokens.adminOps}` },
      });
      if (res.status === 200) {
        recordPass('6.1 Admin with campaigns.moderate can view moderation queue (HTTP 200)');
      } else {
        recordFail(`6.1 Admin moderation access returned ${res.status}, expected 200`);
      }
    } catch (err) {
      recordFail('6.1 Error', err);
    }

    // 6.2: Admin without settings.manage cannot modify sensitive system settings
    try {
      const res = await fetch(`${BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.adminOps}`,
        },
        body: JSON.stringify({ key: 'payoutMode', value: 'live' }),
      });
      if (res.status === 403) {
        recordPass('6.2 Least Privilege: Standard Admin blocked from altering system settings without settings.manage (HTTP 403)');
      } else {
        recordFail(`6.2 Standard Admin modifying settings returned ${res.status}, expected 403`);
      }
    } catch (err) {
      recordFail('6.2 Error', err);
    }

    // 6.3: Super Admin can manage system settings
    try {
      const res = await fetch(`${BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.superAdmin}`,
        },
        body: JSON.stringify({ key: 'payoutMode', value: 'sandbox' }),
      });
      if (res.status === 200) {
        recordPass('6.3 Super Admin holds full operational permissions (HTTP 200)');
      } else {
        recordFail(`6.3 Super Admin modifying settings returned ${res.status}, expected 200`);
      }
    } catch (err) {
      recordFail('6.3 Error', err);
    }

    // =========================================================================
    // SECTION 7: DATA PRIVACY & SENSITIVE FIELD REDACTION
    // =========================================================================
    console.log('\n--- [SECTION 7] Data Privacy & Public Field Redaction ---');

    try {
      const res = await fetch(`${BASE_URL}/api/campaigns/${campaignAId}`, {
        headers: { Authorization: `Bearer ${tokens.creatorA}` },
      });
      if (res.status === 200) {
        const data = await res.json();
        assert(data.campaign);
        assert(data.campaign.organization.name === 'Brand Alpha Pvt Ltd');
        assert(data.campaign.organization.gstin === undefined, 'GSTIN must be redacted from public view');
        recordPass('7.1 Public campaign details redacts sensitive brand GSTIN tax identifier');
      } else {
        recordFail(`7.1 Public campaign details returned ${res.status}, expected 200`);
      }
    } catch (err) {
      recordFail('7.1 Error', err);
    }

  } catch (globalErr) {
    recordFail('Global Test Suite Execution Error', globalErr);
  } finally {
    // Teardown ephemeral fixtures
    console.log('\n--- [CLEANUP] Pruning Ephemeral Test Fixtures ---');
    try {
      if (userBTaskId) {
        await prisma.userTask.deleteMany({ where: { id: userBTaskId } });
      }
      if (campaignAId) {
        await prisma.campaign.deleteMany({ where: { id: campaignAId } });
      }
      if (campaignBId) {
        await prisma.campaign.deleteMany({ where: { id: campaignBId } });
      }
      await prisma.userOrganization.deleteMany({
        where: { organizationId: { in: [testUsers.brandA.orgId, testUsers.brandB.orgId] } },
      });
      await prisma.wallet.deleteMany({
        where: {
          OR: [
            { userId: { in: [testUsers.creatorA.id, testUsers.creatorB.id, testUsers.brandA.id, testUsers.brandB.id] } },
            { organizationId: { in: [testUsers.brandA.orgId, testUsers.brandB.orgId] } },
          ],
        },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: [testUsers.brandA.orgId, testUsers.brandB.orgId] } },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [
              testUsers.creatorA.id,
              testUsers.creatorB.id,
              testUsers.brandA.id,
              testUsers.brandB.id,
            ],
          },
        },
      });
      recordPass('Ephemeral test fixtures safely cleaned from MySQL');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 PORTAL SEPARATION & RBAC SUITE: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPortalRbacSeparationTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
