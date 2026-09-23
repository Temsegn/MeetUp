import { User, DEFAULT_USER_SETTINGS } from '../models/User.model';
import { Workspace } from '../models/Workspace.model';
import { Subscription } from '../models/Subscription.model';
import { connectDB, disconnectDB } from '../db';
import { seedPlans, ensureWorkspaceForUser } from '../../modules/workspace/org.bootstrap';
import { hashPassword } from '../../modules/auth/security/password-hasher';
import { syncInvoiceForWorkspace } from '../../modules/billing/invoice.helpers';

const SEED_USER = {
  name: 'Alex Rivera',
  email: 'user@samtal.dev',
  password: 'UserPass1234',
};

async function seedNormalUser(): Promise<void> {
  await connectDB();
  await seedPlans();

  const passwordHash = await hashPassword(SEED_USER.password);
  const existing = await User.findOne({ email: SEED_USER.email });

  const user = existing
    ? await User.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            name: SEED_USER.name,
            passwordHash,
            authProvider: 'local',
            platformRole: 'none',
            accountStatus: 'active',
            mustChangePassword: false,
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            'settings.account.plan': 'Free',
            'settings.account.role': 'Owner',
          },
          $unset: { googleId: '' },
        },
        { new: true },
      )
    : await User.create({
        name: SEED_USER.name,
        email: SEED_USER.email,
        passwordHash,
        authProvider: 'local',
        platformRole: 'none',
        accountStatus: 'active',
        mustChangePassword: false,
        emailVerifiedAt: new Date(),
        settings: {
          ...DEFAULT_USER_SETTINGS,
          account: { ...DEFAULT_USER_SETTINGS.account, plan: 'Free', role: 'Owner', meetingCapacity: 5 },
        },
      });

  if (!user) throw new Error('Failed to upsert seed user.');

  const membership = await ensureWorkspaceForUser({
    id: String(user._id),
    name: user.name,
    department: user.department,
  });

  await Workspace.updateOne(
    { _id: membership.workspaceId },
    { $set: { email: SEED_USER.email, name: "Alex's workspace" } },
  );

  const sub = await Subscription.findOne({ workspaceId: membership.workspaceId }).lean();
  await syncInvoiceForWorkspace(membership.workspaceId);

  console.log('\nSeeded normal user (Free plan)');
  console.log('  Email:     ', SEED_USER.email);
  console.log('  Password:  ', SEED_USER.password);
  console.log('  Workspace: ', membership.workspaceId);
  console.log('  Role:      ', membership.role, '(workspace) / platform none');
  console.log('  Plan:      ', sub?.planKey ?? 'free');
  console.log('\nSign in at http://localhost:5173 then open Billing to pay and upgrade to Pro ($49) or Enterprise ($299).');
  console.log('Test card:  4242 4242 4242 4242  · any future expiry · any CVC\n');

  await disconnectDB();
}

seedNormalUser().catch(async (err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  try {
    await disconnectDB();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
