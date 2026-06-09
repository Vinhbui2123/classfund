import { getMembersPaymentStatus } from '@/lib/db/queries';
import { db, campaigns } from '@/lib/db';
import CollectionDashboard from './_components/CollectionDashboard';

export const revalidate = 0; // Fresh list on load

export default async function CollectionPage() {
  const { membersStatus } = await getMembersPaymentStatus();
  
  // Get all campaigns for the grid
  const allCampaigns = await db.select().from(campaigns).orderBy(campaigns.status);

  return (
    <CollectionDashboard 
      membersStatus={membersStatus} 
      campaigns={allCampaigns} 
    />
  );
}
