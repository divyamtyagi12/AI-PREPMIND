import { connectDB, disconnectDB } from '../config/db';
import { getConfig } from '../config/env';
import { User } from '../models/User';
import { hashPassword } from '../services/auth.service';

/**
 * CLI utility to safely provision an administrator.
 * Usage: npx tsx src/utils/createAdmin.ts <email> <password> <name>
 */
async function run() {
  const [email, password, name = 'Admin'] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npx tsx src/utils/createAdmin.ts <email> <password> [name]');
    process.exit(1);
  }

  const config = getConfig();
  await connectDB(config.mongoUri);

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    existing.role = 'admin';
    existing.passwordHash = await hashPassword(password);
    await existing.save();
    console.log(`[Admin Provision] Promoted existing user "${existing.email}" to admin role.`);
  } else {
    const admin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      role: 'admin',
      onboardingCompleted: true,
    });
    console.log(`[Admin Provision] Created new admin user: "${admin.email}"`);
  }

  await disconnectDB();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('[Admin Provision Error]:', err);
    process.exit(1);
  });
}

