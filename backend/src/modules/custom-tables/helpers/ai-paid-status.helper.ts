import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { TimeoutError, retry, withTimeout } from '../../../common/utils/async.util';
import {
  isAiCircuitOpen,
  isAiEnabled,
  recordAiFailure,
  recordAiSuccess,
  redactSensitive,
  withAiConcurrency,
} from '../../parsing/helpers/ai-runtime.util';

export type PaidStatusInput = {
  id: string;
  counterparty?: string | null;
  comment?: string | null;
};

type PaidStatusResult = {
  id: string;
  paid: boolean | null;
};

const PAID_PATTERNS = [
  /\bpaid\b/i,
  /\bsettled\b/i,
  /\bcompleted\b/i,
  /\bprocessed\b/i,
  /\bcleared\b/i,
  /оплачен/i,
  /оплачено/i,
  /погашен/i,
  /погашено/i,
  /закрыт/i,
  /закрыта/i,
];

const UNPAID_PATTERNS = [
  /\bunpaid\b/i,
  /\bpending\b/i,
  /\bawaiting\b/i,
  /\bto pay\b/i,
  /не\s*опла/i,
  /неопла/i,
  /ожида/i,
  /к оплат/i,
  /счет\s*на\s*оплат/i,
  /сч[её]т\s*на\s*оплат/i,
];

const heuristicPaidStatus = (input: PaidStatusInput): boolean | null => {
  const combined = `${input.counterparty || ''} ${input.comment || ''}`.trim();
  if (!combined) return null;
  const normalized = combined.toLowerCase();
  if (UNPAID_PATTERNS.some(re => re.test(normalized))) return false;
  if (PAID_PATTERNS.some(re => re.test(normalized))) return true;
  return null;
};

export class AiPaidStatusClassifier {
  private geminiModel: GenerativeModel | null = null;

  constructor(apiKey: string | undefined = process.env.GEMINI_API_KEY) {
    if (apiKey && isAiEnabled()) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiModel = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });
    }
  }

  isAvailable(): boolean {
    return !!this.geminiModel && isAiEnabled();
  }

  async classify(inputs: PaidStatusInput[]): Promise<PaidStatusResult[]> {
    if (!inputs.length) return [];

    const fallback = () =>
      inputs.map(input => ({ id: input.id, paid: heuristicPaidStatus(input) }));

    if (!this.geminiModel || isAiCircuitOpen()) {
      return fallback();
    }

    const sanitized = inputs.map(input => ({
      id: input.id,
      counterparty: redactSensitive(String(input.counterparty || '')).slice(0, 300),
      comment: redactSensitive(String(input.comment || '')).slice(0, 600),
    }));

    try {
      const timeoutMs = Number.parseInt(process.env.AI_TIMEOUT_MS || '20000', 10);
      const completion = await retry(
        () =>
          withTimeout(
            withAiConcurrency(() =>
              this.geminiModel?.generateContent({
                contents: [
                  {
                    role: 'user',
                    parts: [
                      {
                        text: `You classify whether a transaction is paid (settled) or unpaid (pending).
Return ONLY JSON with shape {"results":[{"id":"...","paid":true|false|null}]}. Use null when unclear.
Rules:
- paid=true if text indicates payment completed/settled.
- paid=false if text indicates waiting for payment, invoice pending, unpaid.

Items:
${JSON.stringify({ items: sanitized })}`,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0,
                  responseMimeType: 'application/json',
                },
              }),
            ),
            Number.isFinite(timeoutMs) ? timeoutMs : 20000,
            'AI request timed out',
          ),
        {
          retries: 1,
          baseDelayMs: 500,
          maxDelayMs: 2000,
          isRetryable: error => error instanceof TimeoutError,
        },
      );

      const content = completion.response?.text();
      if (!content) {
        recordAiFailure();
        return fallback();
      }

      const parsed = JSON.parse(content);
      const rawResults = parsed?.results || parsed?.items || parsed?.data || [];
      if (!Array.isArray(rawResults)) {
        recordAiFailure();
        return fallback();
      }

      const byId = new Map<string, boolean | null>();
      for (const item of rawResults) {
        const id = String(item?.id ?? item?.rowId ?? '').trim();
        if (!id) continue;
        let paid: boolean | null = null;
        if (typeof item?.paid === 'boolean') {
          paid = item.paid;
        } else if (item?.paid === null || item?.paid === undefined) {
          paid = null;
        } else if (typeof item?.paid === 'string') {
          const normalized = item.paid.trim().toLowerCase();
          if (['true', 'paid', 'yes', '1'].includes(normalized)) paid = true;
          if (['false', 'unpaid', 'no', '0'].includes(normalized)) paid = false;
        }
        byId.set(id, paid);
      }

      recordAiSuccess();
      return inputs.map(input => ({
        id: input.id,
        paid: byId.has(input.id)
          ? (byId.get(input.id) as boolean | null)
          : heuristicPaidStatus(input),
      }));
    } catch (error) {
      recordAiFailure();
      console.error('[AiPaidStatusClassifier] Failed to classify paid status:', error);
      return fallback();
    }
  }
}
