import { env, pipeline } from '@huggingface/transformers';

type FeatureExtractor = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

export type CategorizationRule = {
  match: string | RegExp;
  category: string;
};

export type TransactionCategorizerOptions = {
  categories: string[];
  rules?: CategorizationRule[];
  threshold?: number;
  modelId?: string;
  allowRemoteModels?: boolean;
  localModelPath?: string;
};

export class TransactionCategorizer {
  private readonly categories: string[];
  private readonly rules: CategorizationRule[];
  private readonly threshold: number;
  private readonly modelId: string;
  private readonly categoryVectors = new Map<string, Float32Array>();

  private extractor: FeatureExtractor | null = null;
  private initPromise: Promise<void> | null = null;
  private modelLoadError: Error | null = null;

  constructor(options: TransactionCategorizerOptions) {
    const categories = [...new Set(options.categories.map(item => item.trim()).filter(Boolean))];

    if (!categories.length) {
      throw new Error('TransactionCategorizer requires at least one category.');
    }

    this.categories = categories;
    this.rules = options.rules ?? [];
    this.threshold = options.threshold ?? 0.35;
    this.modelId = options.modelId ?? 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

    env.allowRemoteModels = options.allowRemoteModels ?? false;

    if (options.localModelPath) {
      env.localModelPath = options.localModelPath;
    }
  }

  async initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.loadModelAndCacheCategories();
    }

    return this.initPromise;
  }

  async categorize(merchantName: string): Promise<string | null> {
    const normalizedMerchant = this.normalizeText(merchantName);

    if (!normalizedMerchant) {
      return null;
    }

    const deterministicCategory = this.matchRules(merchantName);
    if (deterministicCategory) {
      return deterministicCategory;
    }

    await this.initialize();

    if (!this.extractor || this.modelLoadError) {
      return null;
    }

    const merchantVector = await this.embed(normalizedMerchant);
    let bestCategory: string | null = null;
    let bestScore = -1;

    for (const [category, categoryVector] of this.categoryVectors.entries()) {
      const score = this.cosineSimilarity(merchantVector, categoryVector);

      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory && bestScore >= this.threshold ? bestCategory : null;
  }

  getModelLoadError(): Error | null {
    return this.modelLoadError;
  }

  private async loadModelAndCacheCategories(): Promise<void> {
    try {
      this.extractor = (await pipeline('feature-extraction', this.modelId, {
        dtype: 'q8',
      })) as unknown as FeatureExtractor;

      await Promise.all(
        this.categories.map(async category => {
          this.categoryVectors.set(category, await this.embed(this.normalizeText(category)));
        }),
      );
    } catch (error) {
      this.extractor = null;
      this.categoryVectors.clear();
      this.modelLoadError = error instanceof Error ? error : new Error(String(error));
    }
  }

  private matchRules(merchantName: string): string | null {
    const normalizedMerchant = this.normalizeText(merchantName);

    for (const rule of this.rules) {
      if (typeof rule.match === 'string') {
        if (normalizedMerchant.includes(this.normalizeText(rule.match))) {
          return rule.category;
        }

        continue;
      }

      rule.match.lastIndex = 0;
      if (rule.match.test(merchantName)) {
        return rule.category;
      }
    }

    return null;
  }

  private async embed(text: string): Promise<Float32Array> {
    if (!this.extractor) {
      throw new Error('Embedding model is not initialized.');
    }

    const output = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    });

    return Float32Array.from(output.data);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      return -1;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let index = 0; index < a.length; index += 1) {
      dot += a[index] * b[index];
      normA += a[index] * a[index];
      normB += b[index] * b[index];
    }

    if (normA === 0 || normB === 0) {
      return -1;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private normalizeText(value: string): string {
    return value.normalize('NFKC').trim().toLowerCase();
  }
}
