import Settings from '@/app/settings/[[...tab]]/settings';
import { getCurrentUser } from '@/shared/services/serverapi';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return <Settings user={user} />;
}
