import { getCampaignWithMembers } from '@/lib/db/queries';
import { notFound } from 'next/navigation';
import CampaignMembersDashboard from './_components/CampaignMembersDashboard';

export const revalidate = 0; // Fresh load every time

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignMembersPage({ params }: PageProps) {
  const { id } = await params;
  const campaignId = parseInt(id, 10);

  if (isNaN(campaignId)) {
    return notFound();
  }

  const data = await getCampaignWithMembers(campaignId);
  if (!data) {
    return notFound();
  }

  return (
    <CampaignMembersDashboard
      campaign={data.campaign}
      initialMembers={data.members}
    />
  );
}
