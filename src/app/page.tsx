import { getMembersPaymentStatus } from '@/lib/db/queries';
import PublicDashboard from './_components/PublicDashboard';
import { config } from '@/lib/config';

export const revalidate = 0; // Fresh data on reload

export default async function HomePage() {
  const { membersStatus, openCampaigns, balance } = await getMembersPaymentStatus();

  return (
    <PublicDashboard
      initialMembers={membersStatus}
      initialCampaigns={openCampaigns}
      balance={balance}
      bankBin={config.BANK_BIN}
      bankAccountNumber={config.BANK_ACCOUNT_NUMBER}
      bankAccountName={config.BANK_ACCOUNT_NAME}
    />
  );
}
