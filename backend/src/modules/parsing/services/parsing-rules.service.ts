import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import { ParsingRule } from '../../../entities/parsing-rule.entity';
import type { BankName } from '../../../entities/statement.entity';

@Injectable()
export class ParsingRulesService {
  constructor(
    @InjectRepository(ParsingRule)
    private parsingRuleRepository: Repository<ParsingRule>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getRule(bankName: BankName, formatVersion?: string): Promise<ParsingRule | null> {
    const cacheKey = `parsing:rule:${bankName}:${formatVersion || ''}`;
    const cached = await this.cacheManager.get<ParsingRule>(cacheKey);
    if (cached) {
      return cached;
    }

    const rule = await this.parsingRuleRepository.findOne({
      where: {
        bankName,
        formatVersion: formatVersion || '',
        isActive: true,
      },
    });

    if (rule) {
      await this.cacheManager.set(cacheKey, rule, 3600); // 1 hour
    }
    return rule;
  }

  async createRule(rule: Partial<ParsingRule>): Promise<ParsingRule> {
    const parsingRule = this.parsingRuleRepository.create(rule);
    const saved = await this.parsingRuleRepository.save(parsingRule);
    await this.cacheManager.del('parsing:rules:all');
    return saved;
  }

  async updateRule(id: string, updates: Partial<ParsingRule>): Promise<ParsingRule> {
    const rule = await this.parsingRuleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new Error('Parsing rule not found');
    }

    Object.assign(rule, updates);
    const saved = await this.parsingRuleRepository.save(rule);

    // Invalidate caches
    await this.cacheManager.del('parsing:rules:all');
    await this.cacheManager.del(`parsing:rule:${rule.bankName}:${rule.formatVersion || ''}`);

    return saved;
  }

  async getAllRules(): Promise<ParsingRule[]> {
    const cacheKey = 'parsing:rules:all';
    const cached = await this.cacheManager.get<ParsingRule[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rules = await this.parsingRuleRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    await this.cacheManager.set(cacheKey, rules, 3600);
    return rules;
  }
}
