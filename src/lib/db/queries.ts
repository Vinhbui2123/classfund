import { db, members, campaigns, transactions, expenses } from './index';
import { sql, eq, and } from 'drizzle-orm';

export interface MemberCampaignPayment {
  campaignId: number;
  campaignName: string;
  targetAmount: number;
  paidAmount: number;
  status: string;
  isCompleted: boolean;
}

export interface MemberStatus {
  id: number;
  fullName: string;
  normalizedName: string;
  studentId: string | null;
  referenceCode: string;
  contactInfo: string | null;
  totalPaid: number;
  totalTarget: number;
  payments: MemberCampaignPayment[];
  isFullyPaid: boolean; // Completed all active campaigns
}

export async function getDashboardStats() {
  const [totalIncomeResult] = await db.select({
    sum: sql<number>`COALESCE(SUM(${transactions.amountPaid}), 0)::int`
  }).from(transactions);

  const [totalExpenseResult] = await db.select({
    sum: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::int`
  }).from(expenses);

  const [membersCountResult] = await db.select({
    count: sql<number>`COUNT(*)::int`
  }).from(members);

  const [openCampaignsResult] = await db.select({
    count: sql<number>`COUNT(*)::int`
  }).from(campaigns).where(eq(campaigns.status, 'open'));

  const income = totalIncomeResult?.sum || 0;
  const expense = totalExpenseResult?.sum || 0;
  const balance = income - expense;

  return {
    totalIncome: income,
    totalExpense: expense,
    balance,
    membersCount: membersCountResult?.count || 0,
    openCampaignsCount: openCampaignsResult?.count || 0,
  };
}

export async function getMembersPaymentStatus(): Promise<{
  membersStatus: MemberStatus[];
  openCampaigns: typeof campaigns.$inferSelect[];
  balance: number;
}> {
  // Fetch all resources
  const allMembers = await db.select().from(members);
  const allCampaigns = await db.select().from(campaigns);
  const allTransactions = await db.select().from(transactions);
  
  // Calculate balance
  const [totalIncome] = await db.select({
    sum: sql<number>`COALESCE(SUM(${transactions.amountPaid}), 0)::int`
  }).from(transactions);
  
  const [totalExpense] = await db.select({
    sum: sql<number>`COALESCE(SUM(${expenses.amount}), 0)::int`
  }).from(expenses);
  
  const balance = (totalIncome?.sum || 0) - (totalExpense?.sum || 0);

  // Group transactions by member_id and campaign_id
  const txMap = new Map<string, number>();
  for (const tx of allTransactions) {
    const key = `${tx.memberId}-${tx.campaignId}`;
    txMap.set(key, (txMap.get(key) || 0) + tx.amountPaid);
  }

  const membersStatus: MemberStatus[] = allMembers.map((member) => {
    let totalPaid = 0;
    let totalTarget = 0;
    let isFullyPaid = true;

    const payments: MemberCampaignPayment[] = allCampaigns.map((campaign) => {
      const key = `${member.id}-${campaign.id}`;
      const paidAmount = txMap.get(key) || 0;
      const targetAmount = campaign.targetAmount;
      const isCompleted = paidAmount >= targetAmount;

      totalPaid += paidAmount;
      
      // Only calculate active campaigns towards full payments
      if (campaign.status === 'open') {
        totalTarget += targetAmount;
        if (!isCompleted) {
          isFullyPaid = false;
        }
      }

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        targetAmount,
        paidAmount,
        status: campaign.status,
        isCompleted,
      };
    });

    return {
      id: member.id,
      fullName: member.fullName,
      normalizedName: member.normalizedName,
      studentId: member.studentId,
      referenceCode: member.referenceCode,
      contactInfo: member.contactInfo,
      totalPaid,
      totalTarget,
      payments,
      isFullyPaid,
    };
  });

  return {
    membersStatus,
    openCampaigns: allCampaigns.filter(c => c.status === 'open'),
    balance,
  };
}
