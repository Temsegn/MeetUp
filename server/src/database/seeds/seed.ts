import { User, DEFAULT_USER_SETTINGS, type PlatformRole } from '../models/User.model';
import { Workspace } from '../models/Workspace.model';
import { Subscription } from '../models/Subscription.model';
import { connectDB, disconnectDB } from '../db';
import { seedPlans, ensureWorkspaceForUser } from '../../modules/workspace/org.bootstrap';
import { hashPassword } from '../../modules/auth/security/password-hasher';
import { syncInvoiceForWorkspace } from '../../modules/billing/invoice.helpers';

const SHARED_PASSWORD = 'samhal123';

const ACCOUNTS: Array<{
  name: string;
  email: string;
  platformRole: PlatformRole;
  workspaceName: string;
}> = [
  {
    name: 'Admin',
    email: 'admin@gmail.com',
    platformRole: 'super_admin',
    workspaceName: "Admin's workspace",
  },
  {
    name: 'Habib',
    email: 'habib@gmail.com',
    platformRole: 'none',
    workspaceName: "Habib's workspace",
  },
];

async function upsertAccount(account: (typeof ACCOUNTS)[number], passwordHash: string) {
  const existing = await User.findOne({ email: account.email });
  const user = existing
    ? await User.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            name: account.name,
            passwordHash,
            authProvider: 'local',
            platformRole: account.platformRole,
            accountStatus: 'active',
            mustChangePassword: false,
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            'settings.account.plan': 'Free',
            'settings.account.role': account.platformRole === 'super_admin' ? 'Super Admin' : 'Owner',
          },
          $unset: { googleId: '' },
        },
        { returnDocument: 'after' },
      )
    : await User.create({
        name: account.name,
        email: account.email,
        passwordHash,
        authProvider: 'local',
        platformRole: account.platformRole,
        accountStatus: 'active',
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
        settings: {
          ...DEFAULT_USER_SETTINGS,
          account: {
            ...DEFAULT_USER_SETTINGS.account,
            plan: 'Free',
            role: account.platformRole === 'super_admin' ? 'Super Admin' : 'Owner',
            meetingCapacity: 5,
          },
        },
      });

  if (!user) throw new Error(`Failed to upsert ${account.email}`);

  const membership = await ensureWorkspaceForUser({
    id: String(user._id),
    name: user.name,
    department: user.department,
  });

  await Workspace.updateOne(
    { _id: membership.workspaceId },
    { $set: { email: account.email, name: account.workspaceName } },
  );

  const sub = await Subscription.findOne({ workspaceId: membership.workspaceId }).lean();
  await syncInvoiceForWorkspace(membership.workspaceId);

  return {
    email: account.email,
    platformRole: account.platformRole,
    workspaceId: membership.workspaceId,
    workspaceRole: membership.role,
    plan: sub?.planKey ?? 'free',
  };
}

async function seedAccounts(): Promise<void> {
  await connectDB();
  await seedPlans();
  const passwordHash = await hashPassword(SHARED_PASSWORD);

  console.log('\nSeeding deploy accounts…');
  for (const account of ACCOUNTS) {
    const row = await upsertAccount(account, passwordHash);
    console.log(
      `  ${row.email}  role=${row.platformRole}  workspace=${row.workspaceId}  plan=${row.plan}`,
    );
  }
  console.log('\nPassword for both:  samhal123');
  console.log('  Super admin:  admin@gmail.com');
  console.log('  User:         habib@gmail.com\n');

  await disconnectDB();
}

seedAccounts().catch(async (err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  try {
    await disconnectDB();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
