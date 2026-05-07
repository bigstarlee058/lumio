import { Injectable, Logger } from '@nestjs/common';
import { BankProfile } from './bank-profile.service';

type FeatureFlagScalar = string | number | boolean;
type FeatureFlagValue = FeatureFlagScalar | string[] | Record<string, unknown> | null;
type FeatureStats = Record<
  string,
  { enabled: boolean; usageCount: number; lastUsed: string | null }
>;

export interface FeatureFlagConfig {
  enabled: boolean;
  value?: FeatureFlagValue;
  conditions?: FeatureFlagCondition[];
  rolloutPercentage?: number;
  lastUpdated: string;
}

export interface FeatureFlagCondition {
  type: 'user' | 'bank' | 'locale' | 'format' | 'environment' | 'custom' | 'feature';
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'notIn';
  field: string;
  value: string | number | boolean | string[];
}

export interface FeatureFlagContext {
  bankId?: string;
  userId?: string;
  locale?: string;
  format?: string;
  environment?: string;
  customProperties?: Record<string, unknown>;
}

export interface FeatureFlagResult {
  enabled: boolean;
  value?: FeatureFlagValue;
  reason: string;
  source: 'global' | 'condition' | 'rollout' | 'default';
}

export interface FallbackConfig {
  enabled: boolean;
  strategies: FallbackStrategy[];
  autoSwitchThreshold: number; // Quality score threshold for auto-switch
  maxAttempts: number;
  retryDelay: number; // ms
}

export interface FallbackStrategy {
  name: string;
  priority: number;
  conditions: FeatureFlagCondition[];
  actions: {
    parsing: string; // parser to use
    extraction: string; // extraction method
    validation: string; // validation level
    autoFix: boolean;
  };
  enabled: boolean;
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  // Feature flags configuration
  private readonly featureFlags = new Map<string, FeatureFlagConfig>();

  // Fallback configuration
  private fallbackConfig: FallbackConfig;

  // Default configuration
  private readonly defaultFlags: Record<string, FeatureFlagConfig> = {
    // ML and AI features
    'ml-classification': {
      enabled: true,
      rolloutPercentage: 80, // 80% of users
      lastUpdated: new Date().toISOString(),
    },

    'ai-extraction': {
      enabled: true,
      conditions: [
        {
          type: 'bank',
          operator: 'in',
          field: 'bankId',
          value: ['kazkomertsbank', 'halykbank'],
        },
        {
          type: 'environment',
          operator: 'equals',
          field: 'environment',
          value: 'production',
        },
      ],
      lastUpdated: new Date().toISOString(),
    },

    'advanced-metadata-extraction': {
      enabled: true,
      rolloutPercentage: 100, // All users
      lastUpdated: new Date().toISOString(),
    },

    'auto-fix-enabled': {
      enabled: true,
      value: true, // Default value
      conditions: [
        {
          type: 'bank',
          operator: 'notIn',
          field: 'bankId',
          value: ['unknown'],
        },
      ],
      lastUpdated: new Date().toISOString(),
    },

    'checksum-validation': {
      enabled: true,
      value: {
        enabled: true,
        tolerance: 0.02, // 2% tolerance
        autoFix: true,
      },
      lastUpdated: new Date().toISOString(),
    },

    'duplicate-detection': {
      enabled: true,
      value: {
        enabled: true,
        tolerance: 0.95, // 95% similarity threshold
        strictMode: false,
      },
      lastUpdated: new Date().toISOString(),
    },

    'ml-transaction-classification': {
      enabled: true,
      conditions: [
        {
          type: 'format',
          operator: 'in',
          field: 'format',
          value: ['pdf', 'scanned'],
        },
        {
          type: 'bank',
          operator: 'in',
          field: 'bankId',
          value: ['kazkomertsbank'],
        },
      ],
      lastUpdated: new Date().toISOString(),
    },

    'enhanced-date-parsing': {
      enabled: true,
      rolloutPercentage: 100,
      value: {
        enabled: true,
        languages: ['ru', 'kk', 'en'],
        formats: ['auto', 'dd.mm.yyyy', 'mm/dd/yyyy', 'yyyy-mm-dd'],
      },
      lastUpdated: new Date().toISOString(),
    },

    'multi-currency-support': {
      enabled: true,
      conditions: [
        {
          type: 'bank',
          operator: 'in',
          field: 'bankId',
          value: ['halykbank'],
        },
      ],
      lastUpdated: new Date().toISOString(),
    },

    'pdf-ocr-processing': {
      enabled: true,
      conditions: [
        { type: 'format', operator: 'equals', field: 'format', value: 'pdf' },
        {
          type: 'bank',
          operator: 'in',
          field: 'bankId',
          value: ['kazkomertsbank', 'berekebank'],
        },
      ],
      value: {
        enabled: true,
        language: 'auto',
        preprocessing: true,
        confidence: 0.8,
      },
      lastUpdated: new Date().toISOString(),
    },

    'column-detection-ml': {
      enabled: true,
      rolloutPercentage: 60,
      lastUpdated: new Date().toISOString(),
    },

    'quality-monitoring': {
      enabled: true,
      value: {
        enabled: true,
        metrics: ['accuracy', 'completeness', 'consistency'],
        alerting: true,
        thresholds: {
          accuracy: 0.95,
          completeness: 0.98,
          consistency: 0.9,
        },
      },
      lastUpdated: new Date().toISOString(),
    },
  };

  private readonly defaultFallbackConfig: FallbackConfig = {
    enabled: true,
    strategies: [
      {
        name: 'ml-first',
        priority: 1,
        conditions: [
          {
            type: 'feature',
            operator: 'equals',
            field: 'ml-classification',
            value: true,
          },
          {
            type: 'format',
            operator: 'in',
            field: 'format',
            value: ['pdf', 'excel'],
          },
        ],
        actions: {
          parsing: 'ml-enhanced',
          extraction: 'ai-powered',
          validation: 'strict',
          autoFix: true,
        },
        enabled: true,
      },
      {
        name: 'regex-based',
        priority: 2,
        conditions: [
          {
            type: 'feature',
            operator: 'equals',
            field: 'ml-classification',
            value: false,
          },
        ],
        actions: {
          parsing: 'regex-based',
          extraction: 'pattern-matching',
          validation: 'standard',
          autoFix: false,
        },
        enabled: true,
      },
      {
        name: 'basic-heuristic',
        priority: 3,
        conditions: [], // Always available as last resort
        actions: {
          parsing: 'basic',
          extraction: 'simple',
          validation: 'minimal',
          autoFix: false,
        },
        enabled: true,
      },
    ],
    autoSwitchThreshold: 0.7, // Switch strategy if quality < 70%
    maxAttempts: 3,
    retryDelay: 1000,
  };

  constructor() {
    this.initializeFeatureFlags();
    this.fallbackConfig = { ...this.defaultFallbackConfig };
  }

  private initializeFeatureFlags(): void {
    // Load default flags
    Object.entries(this.defaultFlags).forEach(([key, config]) => {
      this.featureFlags.set(key, config);
    });

    // Load custom flags from environment or config
    this.loadEnvironmentFlags();

    this.logger.log(`Initialized ${this.featureFlags.size} feature flags`);
  }

  private loadEnvironmentFlags(): void {
    // Load from environment variables
    const envFlags = {
      'ml-classification': process.env.FEATURE_ML_CLASSIFICATION,
      'ai-extraction': process.env.FEATURE_AI_EXTRACTION,
      'auto-fix-enabled': process.env.FEATURE_AUTO_FIX,
      'checksum-validation': process.env.FEATURE_CHECKSUM_VALIDATION,
      'duplicate-detection': process.env.FEATURE_DUPLICATE_DETECTION,
    };

    Object.entries(envFlags).forEach(([key, value]) => {
      if (value !== undefined) {
        const enabled = value === 'true' || value === '1' || value === 'enabled';
        const existing = this.featureFlags.get(key);

        this.featureFlags.set(key, {
          ...existing,
          enabled,
          lastUpdated: new Date().toISOString(),
        });

        this.logger.log(`Updated feature flag from environment: ${key} = ${enabled}`);
      }
    });
  }

  // Core feature flag methods

  isEnabled(flagName: string, context?: FeatureFlagContext): FeatureFlagResult {
    const flag = this.featureFlags.get(flagName);

    if (!flag) {
      return {
        enabled: false,
        reason: 'Feature flag not found',
        source: 'default',
      };
    }

    // Check if globally disabled
    if (!flag.enabled) {
      return {
        enabled: false,
        reason: 'Feature flag globally disabled',
        source: 'global',
      };
    }

    // Check rollout percentage
    if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
      const rolloutResult = this.checkRolloutPercentage(flag.rolloutPercentage, context);
      if (!rolloutResult.enabled) {
        return rolloutResult;
      }
    }

    // Check conditions
    if (flag.conditions && flag.conditions.length > 0) {
      const conditionResult = this.checkConditions(flag.conditions, context);
      if (!conditionResult.enabled) {
        return conditionResult;
      }
    }

    return {
      enabled: true,
      value: flag.value,
      reason: 'Feature flag enabled and conditions met',
      source: flag.conditions ? 'condition' : 'default',
    };
  }

  getValue(
    flagName: string,
    defaultValue: FeatureFlagValue = null,
    context?: FeatureFlagContext,
  ): FeatureFlagValue {
    const result = this.isEnabled(flagName, context);
    return result.enabled ? (result.value ?? true) : defaultValue;
  }

  // Fallback strategy methods

  getFallbackStrategy(context?: FeatureFlagContext): FallbackStrategy | null {
    if (!this.fallbackConfig.enabled) {
      return null;
    }

    // Find enabled strategies that match conditions
    const matchingStrategies = this.fallbackConfig.strategies
      .filter(strategy => strategy.enabled)
      .filter(strategy => this.checkConditions(strategy.conditions, context).enabled)
      .sort((a, b) => a.priority - b.priority);

    return matchingStrategies.length > 0 ? matchingStrategies[0] : null;
  }

  getAllFallbackStrategies(): FallbackStrategy[] {
    return [...this.fallbackConfig.strategies];
  }

  updateFallbackStrategy(strategyName: string, updates: Partial<FallbackStrategy>): void {
    const strategyIndex = this.fallbackConfig.strategies.findIndex(s => s.name === strategyName);
    if (strategyIndex >= 0) {
      this.fallbackConfig.strategies[strategyIndex] = {
        ...this.fallbackConfig.strategies[strategyIndex],
        ...updates,
      };
      this.logger.log(`Updated fallback strategy: ${strategyName}`);
    }
  }

  shouldAutoSwitch(currentQuality: number, currentStrategy: string): boolean {
    return (
      this.fallbackConfig.enabled &&
      currentQuality < this.fallbackConfig.autoSwitchThreshold &&
      currentStrategy !== 'basic-heuristic'
    ); // Don't switch from basic
  }

  getNextFallbackStrategy(
    currentStrategyName: string,
    context?: FeatureFlagContext,
  ): FallbackStrategy | null {
    const currentStrategy = this.fallbackConfig.strategies.find(
      s => s.name === currentStrategyName,
    );
    if (!currentStrategy) {
      return this.getFallbackStrategy(context);
    }

    const nextPriority = currentStrategy.priority + 1;
    const nextStrategy = this.fallbackConfig.strategies
      .filter(s => s.enabled && s.priority === nextPriority)
      .find(s => this.checkConditions(s.conditions, context).enabled);

    return nextStrategy || null;
  }

  // Configuration management

  updateFeatureFlag(flagName: string, updates: Partial<FeatureFlagConfig>): void {
    const existing = this.featureFlags.get(flagName);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
      this.featureFlags.set(flagName, updated);
      this.logger.log(`Updated feature flag: ${flagName}`);
    }
  }

  setFeatureFlag(flagName: string, config: FeatureFlagConfig): void {
    this.featureFlags.set(flagName, {
      ...config,
      lastUpdated: new Date().toISOString(),
    });
    this.logger.log(`Set feature flag: ${flagName}`);
  }

  disableFeatureFlag(flagName: string): void {
    this.updateFeatureFlag(flagName, { enabled: false });
  }

  enableFeatureFlag(flagName: string): void {
    this.updateFeatureFlag(flagName, { enabled: true });
  }

  // Bank profile integration

  getBankSpecificFlags(
    bankProfile: BankProfile,
    context?: FeatureFlagContext,
  ): Record<string, FeatureFlagResult> {
    const results: Record<string, FeatureFlagResult> = {};
    const bankContext = { ...context, bankId: bankProfile.id };

    // Check all feature flags with bank context
    this.featureFlags.forEach((_config, flagName) => {
      results[flagName] = this.isEnabled(flagName, bankContext);
    });

    // Apply bank-specific feature overrides from profile
    if (bankProfile.features) {
      Object.entries(bankProfile.features).forEach(([featureName, bankValue]) => {
        if (bankValue !== undefined) {
          results[featureName] = {
            enabled: Boolean(bankValue),
            value: bankValue,
            reason: 'Bank-specific configuration',
            source: 'condition',
          };
        }
      });
    }

    return results;
  }

  // Utility methods

  private checkRolloutPercentage(
    percentage: number,
    context?: FeatureFlagContext,
  ): FeatureFlagResult {
    if (!context?.userId) {
      // No user context, use global behavior
      return {
        enabled: percentage === 100,
        reason: percentage === 100 ? '100% rollout' : 'No user context for rollout check',
        source: 'default',
      };
    }

    // Use consistent hash for rollout based on user ID and feature name
    const hash = this.hashString(`${context.userId}-${Date.now()}`);
    const rolloutValue = hash % 100;

    const enabled = rolloutValue < percentage;

    return {
      enabled,
      reason: enabled ? 'User included in rollout' : 'User not included in rollout',
      source: 'rollout',
    };
  }

  private checkConditions(
    conditions: FeatureFlagCondition[],
    context?: FeatureFlagContext,
  ): FeatureFlagResult {
    if (!conditions || conditions.length === 0) {
      return {
        enabled: true,
        reason: 'No conditions to check',
        source: 'default',
      };
    }

    if (!context) {
      return {
        enabled: false,
        reason: 'No context provided for condition evaluation',
        source: 'condition',
      };
    }

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return {
          enabled: false,
          reason: `Condition failed: ${condition.type} ${condition.operator} ${condition.field}`,
          source: 'condition',
        };
      }
    }

    return {
      enabled: true,
      reason: 'All conditions satisfied',
      source: 'condition',
    };
  }

  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    const contextValue = this.getContextValue(condition.field, context);
    const comparableValue =
      typeof contextValue === 'string' ||
      typeof contextValue === 'number' ||
      typeof contextValue === 'boolean'
        ? contextValue
        : String(contextValue);

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'notEquals':
        return contextValue !== condition.value;
      case 'contains':
        return String(contextValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'startsWith':
        return String(contextValue).toLowerCase().startsWith(String(condition.value).toLowerCase());
      case 'endsWith':
        return String(contextValue).toLowerCase().endsWith(String(condition.value).toLowerCase());
      case 'in':
        return (
          Array.isArray(condition.value) &&
          condition.value.map(value => String(value)).includes(String(comparableValue))
        );
      case 'notIn':
        return (
          Array.isArray(condition.value) &&
          !condition.value.map(value => String(value)).includes(String(comparableValue))
        );
      default:
        this.logger.warn(`Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  private getContextValue(field: string, context: FeatureFlagContext): unknown {
    switch (field) {
      case 'bankId':
        return context.bankId;
      case 'userId':
        return context.userId;
      case 'locale':
        return context.locale;
      case 'format':
        return context.format;
      case 'environment':
        return context.environment || process.env.NODE_ENV;
      default:
        return context.customProperties?.[field];
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Monitoring and analytics

  getFeatureUsageStats(): Record<
    string,
    { enabled: boolean; usageCount: number; lastUsed: string | null }
  > {
    // In a real implementation, this would track usage from analytics
    const stats: FeatureStats = {};

    this.featureFlags.forEach((config, flagName) => {
      stats[flagName] = {
        enabled: config.enabled,
        usageCount: 0, // Would come from analytics
        lastUsed: null, // Would come from analytics
      };
    });

    return stats;
  }

  getEnabledFeatures(context?: FeatureFlagContext): string[] {
    const enabled: string[] = [];

    this.featureFlags.forEach((_config, flagName) => {
      if (this.isEnabled(flagName, context).enabled) {
        enabled.push(flagName);
      }
    });

    return enabled;
  }

  exportConfiguration(): {
    flags: Record<string, FeatureFlagConfig>;
    fallback: FallbackConfig;
  } {
    const flags: Record<string, FeatureFlagConfig> = {};

    this.featureFlags.forEach((config, flagName) => {
      flags[flagName] = config;
    });

    return {
      flags,
      fallback: this.fallbackConfig,
    };
  }

  importConfiguration(config: {
    flags?: Record<string, FeatureFlagConfig>;
    fallback?: FallbackConfig;
  }): void {
    if (config.flags) {
      Object.entries(config.flags).forEach(([flagName, flagConfig]) => {
        this.setFeatureFlag(flagName, flagConfig);
      });
    }

    if (config.fallback) {
      this.fallbackConfig = { ...config.fallback };
    }

    this.logger.log('Imported feature flag configuration');
  }

  resetToDefaults(): void {
    this.featureFlags.clear();
    this.fallbackConfig = { ...this.defaultFallbackConfig };
    this.initializeFeatureFlags();
    this.logger.log('Reset feature flags to defaults');
  }
}
