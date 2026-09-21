/**
 * Grants the 'reviewer' role to an existing account. Reviewer is privileged and cannot be
 * self-selected, so this is how you bootstrap the first reviewer (or add another).
 *
 *   npm run grant-reviewer -- someone@example.com
 *
 * Needs Admin credentials: FIREBASE_SERVICE_ACCOUNT_JSON, or Application Default Credentials.
 */
import dotenv from 'dotenv';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '../server/firebaseAdmin';

dotenv.config();

async function main() {
  const email = process.argv[2];
  if (!email || !email.includes('@')) {
    console.error('Usage: npm run grant-reviewer -- <email>');
    process.exit(1);
  }
  const user = await getAuth(getAdminApp()).getUserByEmail(email);
  await getAdminDb()
    .collection('users')
    .doc(user.uid)
    .set({ uid: user.uid, email: user.email ?? email, role: 'reviewer', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Granted reviewer role to ${email} (${user.uid}).`);
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});
