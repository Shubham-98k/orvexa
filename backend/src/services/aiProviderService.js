import { AIUsageLedger } from '../models/AIUsageLedger.js';

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const nonNegativeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getConfig = () => ({
  enabled: process.env.AI_ENABLED === 'true',
  provider: process.env.AI_PROVIDER || 'disabled',
  model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  apiKey: process.env.GEMINI_API_KEY,
  monthlyBudgetInr: nonNegativeNumber(process.env.AI_MONTHLY_BUDGET_INR, 500),
  monthlyRequestLimit: positiveInt(process.env.AI_MONTHLY_REQUEST_LIMIT, 1000),
  userMonthlyLimit: positiveInt(process.env.AI_USER_MONTHLY_LIMIT, 20),
  inputRate: nonNegativeNumber(process.env.AI_INPUT_RATE_INR_PER_MILLION, 0),
  outputRate: nonNegativeNumber(process.env.AI_OUTPUT_RATE_INR_PER_MILLION, 0),
});

export class AIServiceError extends Error {
  constructor(message, { code = 'AI_REQUEST_FAILED', status = 502 } = {}) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.status = status;
  }
}

const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export async function checkAIAvailability(userId) {
  const config = getConfig();
  if (!config.enabled || config.provider === 'disabled') {
    return {
      available: false,
      reason: 'AI assistance is disabled by administrator policy. Manual editing and source analysis remain available.',
      code: 'AI_PROVIDER_DISABLED',
    };
  }
  if (config.provider !== 'gemini') {
    return { available: false, reason: 'The configured AI provider is unsupported.', code: 'AI_PROVIDER_UNSUPPORTED' };
  }
  if (!config.apiKey) {
    return {
      available: false,
      reason: 'Gemini is not configured on the server. Add GEMINI_API_KEY and enable AI to use AI assistance.',
      code: 'AI_API_KEY_MISSING',
    };
  }
  if (!userId) {
    return { available: false, reason: 'Sign in to use AI assistance.', code: 'AI_AUTH_REQUIRED' };
  }

  const startOfMonth = monthStart();
  const [userCount, globalCount, costAgg] = await Promise.all([
    AIUsageLedger.countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
    AIUsageLedger.countDocuments({ createdAt: { $gte: startOfMonth } }),
    AIUsageLedger.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, estimatedCostInr: { $ne: null } } },
      { $group: { _id: null, totalCost: { $sum: '$estimatedCostInr' } } },
    ]),
  ]);

  if (userCount >= config.userMonthlyLimit) {
    return {
      available: false,
      reason: `You have reached the monthly AI assistance limit (${config.userMonthlyLimit} requests). You can continue writing manually.`,
      code: 'USER_LIMIT_REACHED',
    };
  }
  if (globalCount >= config.monthlyRequestLimit) {
    return {
      available: false,
      reason: 'The platform monthly AI request limit has been reached. AI assistance is paused.',
      code: 'REQUEST_CAP_REACHED',
    };
  }

  const pricingConfigured = config.inputRate > 0 && config.outputRate > 0;
  const totalCost = costAgg[0]?.totalCost || 0;
  if (pricingConfigured && totalCost >= config.monthlyBudgetInr) {
    return {
      available: false,
      reason: 'The platform monthly AI budget cap has been reached. AI assistance is paused.',
      code: 'BUDGET_CAP_REACHED',
    };
  }

  return {
    available: true,
    provider: config.provider,
    model: config.model,
    monthlyRequestsRemaining: Math.max(0, config.userMonthlyLimit - userCount),
  };
}

const parseJsonResponse = (text) => {
  const unwrapped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(unwrapped);
  } catch {
    throw new AIServiceError('Gemini returned an invalid structured response. Please retry.', {
      code: 'AI_INVALID_RESPONSE',
      status: 502,
    });
  }
};

export function parseGeminiJsonResponse(payload) {
  const candidate = payload?.candidates?.[0];
  if (!candidate || candidate.finishReason === 'SAFETY') {
    throw new AIServiceError('Gemini could not complete this request. Please revise the request and retry.', {
      code: 'AI_RESPONSE_BLOCKED',
      status: 422,
    });
  }
  const text = candidate.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) {
    throw new AIServiceError('Gemini returned an empty response. Please retry.', {
      code: 'AI_EMPTY_RESPONSE',
      status: 502,
    });
  }
  return parseJsonResponse(text);
}

const requiredString = (value, label, maxLength) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new AIServiceError(`Gemini returned an invalid ${label}. Please retry.`, {
      code: 'AI_INVALID_RESPONSE',
      status: 502,
    });
  }
  return value.trim();
};

const validateOutline = (value) => {
  if (!Array.isArray(value?.sections) || value.sections.length < 3 || value.sections.length > 8) {
    throw new AIServiceError('Gemini returned an invalid outline. Please retry.', { code: 'AI_INVALID_RESPONSE' });
  }
  return {
    sections: value.sections.map((section) => ({
      heading: requiredString(section?.heading, 'outline heading', 140),
      notes: typeof section.notes === 'string' ? section.notes.slice(0, 500) : '',
      suggestedFocus: typeof section.suggestedFocus === 'string' ? section.suggestedFocus.slice(0, 500) : '',
    })),
  };
};

const validateDraft = (value) => {
  const formats = ['guide', 'explainer', 'research', 'perspective', 'notes', 'synthesis', 'freeform', 'other'];
  const allowedTypes = new Set(['paragraph', 'heading2', 'callout']);
  if (!Array.isArray(value?.blocks) || value.blocks.length < 1 || value.blocks.length > 40) {
    throw new AIServiceError('Gemini returned an invalid article draft. Please retry.', { code: 'AI_INVALID_RESPONSE' });
  }
  const outline = validateOutline({ sections: value.outline });
  return {
    title: requiredString(value.title, 'article title', 160),
    subtitle: typeof value.subtitle === 'string' ? value.subtitle.slice(0, 240) : '',
    summary: typeof value.summary === 'string' ? value.summary.slice(0, 600) : '',
    format: formats.includes(value.format) ? value.format : 'synthesis',
    outline: outline.sections,
    blocks: value.blocks.map((block) => {
      if (!allowedTypes.has(block?.type)) {
        throw new AIServiceError('Gemini returned an unsupported article block. Please retry.', {
          code: 'AI_INVALID_RESPONSE',
        });
      }
      return {
        type: block.type,
        content: requiredString(block.content, 'article block', 6000),
      };
    }),
  };
};

const validateReview = (value, allowedBlockIds) => {
  if (!Array.isArray(value?.suggestions) || value.suggestions.length > 10) {
    throw new AIServiceError('Gemini returned an invalid review. Please retry.', { code: 'AI_INVALID_RESPONSE' });
  }
  return {
    suggestions: value.suggestions.map((suggestion) => {
      const blockId = suggestion.blockId ?? null;
      if (blockId !== null && (typeof blockId !== 'string' || !allowedBlockIds.has(blockId))) {
        throw new AIServiceError('Gemini returned a review for an unknown article block. Please retry.', {
          code: 'AI_INVALID_RESPONSE',
        });
      }
      return {
        blockId,
        category: requiredString(suggestion.category, 'review category', 80),
        finding: requiredString(suggestion.finding, 'review finding', 500),
        recommendation: requiredString(suggestion.recommendation, 'review recommendation', 600),
        replacementText: typeof suggestion.replacementText === 'string'
          ? suggestion.replacementText.slice(0, 6000)
          : '',
      };
    }),
  };
};

const validateByOperation = (operation, result, context) => {
  if (operation === 'outline') return validateOutline(result);
  if (operation === 'draft') return validateDraft(result);
  if (operation === 'section') return { content: requiredString(result?.content, 'section draft', 8000) };
  if (operation === 'rewrite') return { rewrittenText: requiredString(result?.rewrittenText, 'rewrite', 8000) };
  if (operation === 'assistant') {
    if (!Array.isArray(result?.suggestions) || result.suggestions.length > 5) {
      throw new AIServiceError('Gemini returned an invalid assistant response. Please retry.', { code: 'AI_INVALID_RESPONSE' });
    }
    return {
      answer: requiredString(result.answer, 'assistant response', 4000),
      suggestions: result.suggestions.map((item) => ({
        label: requiredString(item.label, 'suggestion label', 100),
        content: requiredString(item.content, 'suggestion', 3000),
      })),
    };
  }
  if (operation === 'review') return validateReview(result, context.allowedBlockIds);
  throw new AIServiceError('Unsupported AI operation.', { code: 'AI_OPERATION_UNSUPPORTED', status: 400 });
};

const getGeminiHttpError = async (response) => {
  let upstreamError = {};
  try {
    upstreamError = (await response.json())?.error || {};
  } catch {
    // Keep diagnostics safe when Gemini returns a non-JSON error body.
  }

  const upstreamStatus = String(upstreamError.status || '').toUpperCase();
  const upstreamMessage = String(upstreamError.message || '').toLowerCase();
  if (
    response.status === 401
    || response.status === 403
    || upstreamStatus === 'UNAUTHENTICATED'
    || upstreamStatus === 'PERMISSION_DENIED'
    || /api key.*not valid|invalid api key/.test(upstreamMessage)
  ) {
    return new AIServiceError(
      'Gemini rejected the API key or this key lacks access. Verify the key in the backend environment, its API restrictions, and that the Gemini API is enabled for its Google Cloud project.',
      { code: 'AI_API_KEY_REJECTED', status: 502 }
    );
  }

  if (response.status === 404 || upstreamStatus === 'NOT_FOUND') {
    return new AIServiceError(
      'The configured Gemini model was not found or is unavailable to this key. Check GEMINI_MODEL and the model access for this project.',
      { code: 'AI_MODEL_UNAVAILABLE', status: 502 }
    );
  }

  if (response.status === 429 || upstreamStatus === 'RESOURCE_EXHAUSTED') {
    return new AIServiceError(
      'Gemini quota or rate limit was reached. Check the Google AI project quota and billing; the app request limit is separate.',
      { code: 'AI_UPSTREAM_RATE_LIMIT', status: 429 }
    );
  }

  if (response.status === 400) {
    return new AIServiceError(
      'Gemini rejected the request. Check GEMINI_MODEL and the backend Gemini API configuration.',
      { code: 'AI_UPSTREAM_INVALID_REQUEST', status: 502 }
    );
  }

  return new AIServiceError(
    'Gemini is temporarily unavailable. Check the backend logs and try again.',
    { code: 'AI_UPSTREAM_ERROR', status: 502 }
  );
};

const recordUsage = async ({ userId, draftId, operation, provider, model, usage, durationMs, success, error }) => {
  const config = getConfig();
  const inputTokens = Number(usage?.promptTokenCount) || 0;
  const outputTokens = Number(usage?.candidatesTokenCount) || 0;
  const hasPricing = config.inputRate > 0 && config.outputRate > 0;
  await AIUsageLedger.create({
    userId,
    operationType: operation,
    draftId: draftId || null,
    provider,
    model,
    inputTokens,
    outputTokens,
    estimatedCostInr: hasPricing
      ? (inputTokens * config.inputRate + outputTokens * config.outputRate) / 1_000_000
      : null,
    durationMs,
    success,
    errorReason: error?.code || (error ? 'AI_REQUEST_FAILED' : null),
  });
};

async function runGemini({ userId, draftId, operation, systemPrompt, userPrompt, context = {} }) {
  const availability = await checkAIAvailability(userId);
  if (!availability.available) {
    throw new AIServiceError(availability.reason, { code: availability.code, status: 403 });
  }

  const config = getConfig();
  const start = Date.now();
  let result;
  let usage = null;
  let failure = null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: operation === 'draft' ? 6000 : 3000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) throw await getGeminiHttpError(response);

    const payload = await response.json();
    usage = payload.usageMetadata || null;
    result = validateByOperation(operation, parseGeminiJsonResponse(payload), context);
  } catch (error) {
    failure = error instanceof AIServiceError
      ? error
      : new AIServiceError(
        error?.name === 'TimeoutError' || error?.name === 'AbortError'
          ? 'The AI request timed out. Please try again.'
          : 'The AI request failed. Please try again.',
        { code: error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_REQUEST_FAILED' }
      );
  }

  await recordUsage({
    userId,
    draftId,
    operation,
    provider: config.provider,
    model: config.model,
    usage,
    durationMs: Date.now() - start,
    success: !failure,
    error: failure,
  });
  if (failure) throw failure;
  return result;
}

export const aiGenerateOutline = (options) => runGemini({ ...options, operation: 'outline' });
export const aiDraftArticle = (options) => runGemini({ ...options, operation: 'draft' });
export const aiDraftSection = (options) => runGemini({ ...options, operation: 'section' });
export const aiRewriteSelection = (options) => runGemini({ ...options, operation: 'rewrite' });
export const aiAssist = (options) => runGemini({ ...options, operation: 'assistant' });
export const aiReviewDraft = (options) => runGemini({ ...options, operation: 'review' });

export async function getAISpendingStats() {
  const config = getConfig();
  const startOfMonth = monthStart();
  const [totalOperations, monthOperations, totalCostAgg, recentLedger] = await Promise.all([
    AIUsageLedger.countDocuments(),
    AIUsageLedger.countDocuments({ createdAt: { $gte: startOfMonth } }),
    AIUsageLedger.aggregate([
      { $match: { createdAt: { $gte: startOfMonth }, estimatedCostInr: { $ne: null } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$estimatedCostInr' },
          totalTokens: { $sum: { $add: ['$inputTokens', '$outputTokens'] } },
        },
      },
    ]),
    AIUsageLedger.find().sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return {
    enabled: config.enabled && config.provider === 'gemini' && Boolean(config.apiKey),
    provider: config.provider,
    model: config.model,
    monthlyBudgetInr: config.monthlyBudgetInr,
    monthlyRequestLimit: config.monthlyRequestLimit,
    userMonthlyLimit: config.userMonthlyLimit,
    pricingConfigured: config.inputRate > 0 && config.outputRate > 0,
    totalOperations,
    monthOperations,
    monthCostInr: totalCostAgg[0]?.totalCost ?? null,
    monthTokens: totalCostAgg[0]?.totalTokens || 0,
    recentLedger,
  };
}
