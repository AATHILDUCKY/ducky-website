import { requireAdmin } from '@/lib/auth';
import { getNewRequestCount } from '@/lib/contact-requests';
import { getHomepage } from '@/lib/homepage';
import { getProfile } from '@/lib/db';
import { AdminShell } from '@/components/admin-shell';
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const [p, newRequests, homepage] = await Promise.all([
    getProfile(),
    getNewRequestCount(),
    getHomepage(),
  ]);
  return (
    <AdminShell name={p.name} newRequests={newRequests} branding={homepage.branding}>
      {children}
    </AdminShell>
  );
}
