/**
 * Dev helper: upsert platform superadmin credentials.
 * Usage: npx tsx scripts/upsert-superadmin.ts
 */
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL = 'superadmin@samtal.com';
const PASSWORD = 'SuperAdmin1!';
const NAME = 'Samtal Super Admin';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/meetspace';
  await mongoose.connect(uri);
  const hash = await bcrypt.hash(PASSWORD, 10);
  const col = mongoose.connection.collection('users');
  const existing = await col.findOne({ email: EMAIL });

  if (existing) {
    await col.updateOne(
      { email: EMAIL },
      {
        $set: {
          name: NAME,
          platformRole: 'super_admin',
          accountStatus: 'active',
          passwordHash: hash,
          emailVerifiedAt: new Date(),
          mustChangePassword: false,
          authProvider: 'local',
          passwordChangedAt: new Date(),
        },
      },
    );
    console.log('UPDATED existing superadmin');
  } else {
    await col.insertOne({
      name: NAME,
      email: EMAIL,
      passwordHash: hash,
      authProvider: 'local',
      googleId: null,
      avatarColor: 'hsl(210, 60%, 50%)',
      avatarUrl: null,
      jobTitle: 'Platform Super Admin',
      department: '',
      phone: '',
      mustChangePassword: false,
      platformRole: 'super_admin',
      accountStatus: 'active',
      emailVerifiedAt: new Date(),
      passwordChangedAt: null,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('CREATED new superadmin');
  }

  console.log('email=' + EMAIL);
  console.log('password=' + PASSWORD);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
