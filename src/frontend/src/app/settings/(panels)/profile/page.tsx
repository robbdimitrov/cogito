import { notFound } from 'next/navigation';
import ProfileClient from '@/app/settings/(panels)/profile/profileclient';
import { getCurrentUser } from '@/shared/services/serverapi';

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  return <ProfileClient user={user} />;
}
