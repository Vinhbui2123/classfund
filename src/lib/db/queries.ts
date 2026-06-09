import { db, members, campaigns, transactions, expenses, campaignMembers } from './index';
import { sql, eq, and } from 'drizzle-orm';

export interface MemberCampaignPayment {
  campaignId: number;
  campaignName: string;
  targetAmount: number; // will be expectedAmount for this member
  paidAmount: number;
  status: string;
  isCompleted: boolean;
  isEnrolled: boolean;
  note?: string | null;
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

export interface CampaignMemberDetail {
  memberId: number;
  fullName: string;
  studentId: string | null;
  referenceCode: string;
  expectedAmount: number;
  paidAmount: number;
  remaining: number;
  status: 'unpaid' | 'partial' | 'full' | 'overpaid';
  isEnrolled: boolean;
  note: string | null;
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
  const allCampaignMembers = await db.select().from(campaignMembers);
  
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

  // Map enrollments
  const enrollmentMap = new Map<string, typeof campaignMembers.$inferSelect>();
  for (const cm of allCampaignMembers) {
    enrollmentMap.set(`${cm.memberId}-${cm.campaignId}`, cm);
  }

  const membersStatus: MemberStatus[] = allMembers.map((member) => {
    let totalPaid = 0;
    let totalTarget = 0;
    let isFullyPaid = true;

    const payments: MemberCampaignPayment[] = allCampaigns.map((campaign) => {
      const key = `${member.id}-${campaign.id}`;
      const enrollment = enrollmentMap.get(key);
      const isEnrolled = !!enrollment;
      const targetAmount = enrollment ? enrollment.expectedAmount : 0;
      const paidAmount = txMap.get(key) || 0;
      const isCompleted = isEnrolled ? (paidAmount >= targetAmount) : true;

      totalPaid += paidAmount;
      
      // Only calculate active campaigns towards full payments
      if (campaign.status === 'open' && isEnrolled) {
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
        isEnrolled,
        note: enrollment ? enrollment.note : null,
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

export async function getCampaignWithMembers(campaignId: number): Promise<{
  campaign: typeof campaigns.$inferSelect;
  members: CampaignMemberDetail[];
} | null> {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return null;

  const allMembers = await db.select().from(members);
  const enrollments = await db.select()
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId));

  const txs = await db.select()
    .from(transactions)
    .where(eq(transactions.campaignId, campaignId));

  // Build maps
  const enrollmentMap = new Map(enrollments.map(e => [e.memberId, e]));
  const txMap = new Map<number, number>();
  for (const t of txs) {
    txMap.set(t.memberId, (txMap.get(t.memberId) || 0) + t.amountPaid);
  }

  const details: CampaignMemberDetail[] = allMembers.map(m => {
    const enrollment = enrollmentMap.get(m.id);
    const expected = enrollment ? enrollment.expectedAmount : 0;
    const paid = txMap.get(m.id) || 0;
    const remaining = Math.max(0, expected - paid);
    
    let status: 'unpaid' | 'partial' | 'full' | 'overpaid' = 'unpaid';
    if (enrollment) {
      if (paid === 0) status = 'unpaid';
      else if (paid < expected) status = 'partial';
      else if (paid === expected) status = 'full';
      else status = 'overpaid';
    }

    return {
      memberId: m.id,
      fullName: m.fullName,
      studentId: m.studentId,
      referenceCode: m.referenceCode,
      expectedAmount: expected,
      paidAmount: paid,
      remaining,
      status,
      isEnrolled: !!enrollment,
      note: enrollment ? enrollment.note : null,
    };
  });

  return {
    campaign,
    members: details,
  };
}

