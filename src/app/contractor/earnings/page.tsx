import { redirect } from 'next/navigation';

// Consolidated: two separate earnings pages (this one and
// /dashboard/contractor/earnings) had drifted into parallel
// implementations hitting different API endpoints. The dashboard
// version is canonical — it has CSV export and more inbound links.
export default function ContractorEarningsRedirect() {
  redirect('/dashboard/contractor/earnings');
}
