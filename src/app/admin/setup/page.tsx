import { db, members, campaigns } from '@/lib/db';
import SetupDashboard from './_components/SetupDashboard';

export const revalidate = 0; // Fresh list on tab load

export default async function SetupPage() {
  const allMembers = await db.select().from(members);
  
  // Sort campaigns: open ones first, then newest ones
  const allCampaigns = await db.select().from(campaigns).orderBy(campaigns.status);

  return (
    <SetupDashboard 
      initialMembers={allMembers} 
      initialCampaigns={allCampaigns} 
    />
  );
}
