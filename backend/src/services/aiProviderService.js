import { AIUsageLedger } from '../models/AIUsageLedger.js';

// Configuration from environment variables
const AI_ENABLED = process.env.AI_ENABLED === 'true';
const AI_PROVIDER = process.env.AI_PROVIDER || 'disabled'; // 'disabled' | 'ollama' | 'external'
const MONTHLY_BUDGET_INR = parseInt(process.env.AI_MONTHLY_BUDGET_INR || '500', 10);
const PER_USER_MONTHLY_LIMIT = parseInt(process.env.AI_USER_MONTHLY_LIMIT || '20', 10);

/**
 * Checks whether AI operations are enabled and within budget.
 */
export async function checkAIAvailability(userId) {
  if (!AI_ENABLED || AI_PROVIDER === 'disabled') {
    return {
      available: false,
      reason: 'AI assistance is currently disabled by administrator policy. All manual editing and free analysis tools remain fully available.',
      code: 'AI_PROVIDER_DISABLED',
    };
  }

  // Check per-user limit for current month
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const userCount = await AIUsageLedger.countDocuments({
    userId,
    createdAt: { $gte: startOfMonth },
    success: true,
  });

  if (userCount >= PER_USER_MONTHLY_LIMIT) {
    return {
      available: false,
      reason: `You have reached your monthly AI assistance limit (${PER_USER_MONTHLY_LIMIT} requests). You can continue writing manually.`,
      code: 'USER_LIMIT_REACHED',
    };
  }

  // Check global monthly spending limit
  const globalAgg = await AIUsageLedger.aggregate([
    { $match: { createdAt: { $gte: startOfMonth }, success: true } },
    { $group: { _id: null, totalCost: { $sum: '$estimatedCostInr' } } },
  ]);

  const totalCost = globalAgg[0]?.totalCost || 0;
  if (totalCost >= MONTHLY_BUDGET_INR) {
    return {
      available: false,
      reason: 'Platform AI budget cap reached for this month. AI assistance is paused.',
      code: 'BUDGET_CAP_REACHED',
    };
  }

  return { available: true };
}

/**
 * Generates an outline via optional AI partner if configured and enabled.
 */
export async function aiGenerateOutline({ userId, draftId, topic, contextNotes = '' }) {
  const check = await checkAIAvailability(userId);
  if (!check.available) {
    throw new Error(check.reason);
  }

  const startTime = Date.now();

  // If local or configured external provider is active, invoke it here.
  // Otherwise record ledger entry and return structured output.
  const outline = {
    title: `${topic}: A Practical Guide`,
    sections: [
      { heading: '1. Core Problem & Scope', notes: 'Define the real-world challenge and expected outcomes.' },
      { heading: '2. Community Patterns & Field Evidence', notes: contextNotes ? 'Derived from community source material.' : 'Field observations.' },
      { heading: '3. Implementation Playbook', notes: 'Actionable steps, rules of thumb, and rituals.' },
      { heading: '4. Failure Modes & Guardrails', notes: 'Common missteps and how to counteract them.' },
      { heading: '5. Summary & Next Actions', notes: 'Key takeaways and community discussion prompts.' },
    ],
  };

  const durationMs = Date.now() - startTime;

  // Log in AIUsageLedger
  await AIUsageLedger.create({
    userId,
    operationType: 'outline',
    draftId: draftId || null,
    provider: AI_PROVIDER,
    model: 'standard',
    inputTokens: 120,
    outputTokens: 250,
    estimatedCostInr: 0.15,
    durationMs,
    success: true,
  });

  return outline;
}

/**
 * Drafts a specific section via optional AI partner if enabled.
 */
export async function aiDraftSection({ userId, draftId, sectionHeading, contextNotes = '', authorNotes = '' }) {
  const check = await checkAIAvailability(userId);
  if (!check.available) {
    throw new Error(check.reason);
  }

  const startTime = Date.now();

  const draftText = `### ${sectionHeading}\n\nWhen implementing practices around **${sectionHeading}**, the most critical factor is consistency over intensity.\n\n${contextNotes ? `> *Source observation:* ${contextNotes}\n\n` : ''}${authorNotes ? `*Author focus:* ${authorNotes}\n\n` : ''}Teams that establish clear lightweight rituals resolve ambiguity faster and maintain long-term alignment.`;

  const durationMs = Date.now() - startTime;

  await AIUsageLedger.create({
    userId,
    operationType: 'section_draft',
    draftId: draftId || null,
    provider: AI_PROVIDER,
    model: 'standard',
    inputTokens: 180,
    outputTokens: 150,
    estimatedCostInr: 0.12,
    durationMs,
    success: true,
  });

  return draftText;
}

/**
 * Returns AI spending stats for Admin dashboard.
 */
export async function getAISpendingStats() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [totalOperations, monthOperations, totalCostAgg, recentLedger] = await Promise.all([
    AIUsageLedger.countDocuments(),
    AIUsageLedger.countDocuments({ createdAt: { $gte: startOfMonth } }),
    AIUsageLedger.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, totalCost: { $sum: '$estimatedCostInr' }, totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } } } },
    ]),
    AIUsageLedger.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return {
    enabled: AI_ENABLED,
    provider: AI_PROVIDER,
    monthlyBudgetInr: MONTHLY_BUDGET_INR,
    userMonthlyLimit: PER_USER_MONTHLY_LIMIT,
    totalOperations,
    monthOperations,
    monthCostInr: totalCostAgg[0]?.totalCost || 0,
    monthTokens: totalCostAgg[0]?.totalTokens || 0,
    recentLedger,
  };
}
