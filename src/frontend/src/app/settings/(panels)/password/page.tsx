import { notFound } from 'next/navigation';
import PasswordClient from '@/app/settings/(panels)/password/passwordclient';
import { getCurrentUser } from '@/shared/services/serverapi';

export default async function PasswordSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  return <PasswordClient user={user} />;
}
