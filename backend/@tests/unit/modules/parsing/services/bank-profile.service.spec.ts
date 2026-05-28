import { BankProfileService, BankProfile } from '@/modules/parsing/services/bank-profile.service';

describe('BankProfileService', () => {
  let service: BankProfileService;

  // Minimal valid profile for testing
  const makeProfile = (overrides: Partial<BankProfile> = {}): BankProfile => ({
    id: 'test-bank',
    name: 'Test Bank',
    displayName: 'Test Bank JSC',
    country: 'KZ',
    locale: 'ru',
    currency: 'KZT',
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    identification: {
      documentPatterns: ['test bank'],
      filenamePatterns: ['testbank_.*\\.pdf'],
      textPatterns: ['Test Bank JSC'],
    },
    parsing: {
      format: 'pdf',
      columns: [
        { name: 'date', type: 'date', required: true },
        { name: 'debit', type: 'amount', required: false },
        { name: 'credit', type: 'amount', required: false },
        { name: 'description', type: 'string', required: false },
      ],
    },
    metadata: {},
    validation: {},
    quality: {},
    features: {},
    ...overrides,
  });

  beforeEach(() => {
    service = new BankProfileService();
  });

  describe('profile initialization', () => {
    it('initializes without throwing', () => {
      expect(service).toBeDefined();
    });

    it('getAllProfiles returns an array on init', () => {
      expect(Array.isArray(service.getAllProfiles())).toBe(true);
    });

    it('loads YAML profiles from config with stable ids', () => {
      expect(service.getProfile('bofa-en')?.name).toBe('Bank of America');
      expect(service.getProfile('kaspi-kk')?.name).toBe('Kaspi Bank');
    });
  });

  describe('getProfile', () => {
    it('returns profile by id', () => {
      service.addProfile(makeProfile({ id: 'my-bank' }));

      const result = service.getProfile('my-bank');

      expect(result).toBeDefined();
      expect(result?.id).toBe('my-bank');
    });

    it('returns undefined for non-existent id', () => {
      const result = service.getProfile('non-existent-bank');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllProfiles', () => {
    it('returns an array of profiles', () => {
      const profiles = service.getAllProfiles();

      expect(Array.isArray(profiles)).toBe(true);
    });

    it('includes newly added profiles', () => {
      const initialCount = service.getAllProfiles().length;
      service.addProfile(makeProfile({ id: 'new-bank' }));

      expect(service.getAllProfiles().length).toBe(initialCount + 1);
    });
  });

  describe('addProfile', () => {
    it('adds a profile that can be retrieved by id', () => {
      const profile = makeProfile({ id: 'added-bank', name: 'Added Bank' });

      service.addProfile(profile);

      expect(service.getProfile('added-bank')?.name).toBe('Added Bank');
    });

    it('overwrites existing profile with same id', () => {
      service.addProfile(makeProfile({ id: 'dup-bank', name: 'Original' }));
      service.addProfile(makeProfile({ id: 'dup-bank', name: 'Updated' }));

      expect(service.getProfile('dup-bank')?.name).toBe('Updated');
    });
  });

  describe('updateProfile', () => {
    it('updates an existing profile', () => {
      service.addProfile(makeProfile({ id: 'update-target', name: 'Old Name' }));

      service.updateProfile('update-target', { name: 'New Name' });

      expect(service.getProfile('update-target')?.name).toBe('New Name');
    });

    it('updates lastUpdated timestamp', () => {
      service.addProfile(makeProfile({ id: 'ts-test', lastUpdated: '2020-01-01T00:00:00.000Z' }));

      service.updateProfile('ts-test', { name: 'Changed' });

      const updated = service.getProfile('ts-test');
      expect(updated?.lastUpdated).not.toBe('2020-01-01T00:00:00.000Z');
    });

    it('does nothing for non-existent profile id', () => {
      expect(() => service.updateProfile('ghost-bank', { name: 'Ghost' })).not.toThrow();
    });
  });

  describe('removeProfile', () => {
    it('removes an existing profile and returns true', () => {
      service.addProfile(makeProfile({ id: 'to-remove' }));

      const result = service.removeProfile('to-remove');

      expect(result).toBe(true);
      expect(service.getProfile('to-remove')).toBeUndefined();
    });

    it('returns false for non-existent profile', () => {
      const result = service.removeProfile('does-not-exist');

      expect(result).toBe(false);
    });
  });

  describe('findProfileByFileName', () => {
    it('finds profile matching filename pattern', () => {
      service.addProfile(makeProfile({
        id: 'filename-test-bank',
        identification: {
          documentPatterns: [],
          filenamePatterns: ['unique-testbank-.*\\.pdf'],
          textPatterns: [],
        },
      }));

      const result = service.findProfileByFileName('unique-testbank-2026.pdf');

      expect(result).toBeDefined();
      expect(result?.id).toBe('filename-test-bank');
    });

    it('returns undefined for unrecognized filename', () => {
      const result = service.findProfileByFileName('totally_unknown_file_xyz_2026.pdf');

      expect(result).toBeUndefined();
    });
  });

  describe('findProfileByText', () => {
    it('finds profile matching text pattern', () => {
      service.addProfile(makeProfile({
        id: 'text-test-bank',
        identification: {
          documentPatterns: [],
          filenamePatterns: [],
          textPatterns: ['UNIQUE_BANK_IDENTIFIER_XYZ'],
        },
      }));

      const result = service.findProfileByText('UNIQUE_BANK_IDENTIFIER_XYZ statement');

      expect(result).toBeDefined();
      expect(result?.id).toBe('text-test-bank');
    });

    it('returns undefined for unrecognized text', () => {
      const result = service.findProfileByText('totally random unrelated document text');

      expect(result).toBeUndefined();
    });
  });

  describe('findProfileByContent', () => {
    it('delegates to findProfileByText', () => {
      service.addProfile(makeProfile({
        id: 'content-test-bank',
        identification: {
          documentPatterns: [],
          filenamePatterns: [],
          textPatterns: ['CONTENT_TEST_PATTERN_UNIQUE'],
        },
      }));

      const byText = service.findProfileByText('CONTENT_TEST_PATTERN_UNIQUE');
      const byContent = service.findProfileByContent('CONTENT_TEST_PATTERN_UNIQUE');

      expect(byText?.id).toBe(byContent?.id);
    });
  });

  describe('validateProfile', () => {
    it('returns valid for a well-formed profile', () => {
      const profile = makeProfile();

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for missing id', () => {
      const profile = makeProfile({ id: '' });

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Profile ID is required');
    });

    it('returns error for missing name', () => {
      const profile = makeProfile({ name: '' });

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Profile name is required');
    });

    it('returns error for invalid country code length', () => {
      const profile = makeProfile({ country: 'KAZ' });

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('country'))).toBe(true);
    });

    it('returns error for invalid currency code length', () => {
      const profile = makeProfile({ currency: 'KZ' });

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('currency'))).toBe(true);
    });

    it('returns error when no columns defined', () => {
      const profile = makeProfile();
      profile.parsing.columns = [];

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('column'))).toBe(true);
    });

    it('returns error when no date column defined', () => {
      const profile = makeProfile();
      profile.parsing.columns = [{ name: 'amount', type: 'amount', required: true }];

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('date column'))).toBe(true);
    });

    it('returns error when no amount column defined', () => {
      const profile = makeProfile();
      profile.parsing.columns = [{ name: 'date', type: 'date', required: true }];

      const result = service.validateProfile(profile);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('amount column'))).toBe(true);
    });
  });

  describe('exportProfile', () => {
    it('exports profile as JSON string', () => {
      service.addProfile(makeProfile({ id: 'export-test' }));

      const exported = service.exportProfile('export-test', 'json');

      expect(exported).not.toBeNull();
      const parsed = JSON.parse(exported!);
      expect(parsed.id).toBe('export-test');
    });

    it('returns null for non-existent profile', () => {
      const result = service.exportProfile('ghost-bank', 'json');

      expect(result).toBeNull();
    });
  });

  describe('importProfile', () => {
    it('imports a valid JSON profile', () => {
      const profile = makeProfile({ id: 'imported-bank', name: 'Imported Bank' });
      const json = JSON.stringify(profile);

      const result = service.importProfile(json, 'json');

      expect(result.success).toBe(true);
      expect(result.profile?.id).toBe('imported-bank');
      expect(service.getProfile('imported-bank')).toBeDefined();
    });

    it('returns error for invalid JSON', () => {
      const result = service.importProfile('not valid json', 'json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for invalid profile structure', () => {
      const invalidProfile = JSON.stringify({ id: '', name: '' });

      const result = service.importProfile(invalidProfile, 'json');

      expect(result.success).toBe(false);
    });

    it('imports a valid YAML profile', () => {
      const profile = makeProfile({ id: 'yaml-bank', name: 'YAML Bank' });
      const yaml = `
id: ${profile.id}
name: ${profile.name}
displayName: ${profile.displayName}
country: ${profile.country}
locale: ${profile.locale}
currency: ${profile.currency}
version: ${profile.version}
lastUpdated: ${profile.lastUpdated}
identification:
  documentPatterns:
    - test bank
  filenamePatterns:
    - testbank_.*\\.pdf
  textPatterns:
    - Test Bank JSC
parsing:
  format: pdf
  columns:
    - name: date
      type: date
      required: true
    - name: amount
      type: amount
      required: true
metadata: {}
validation: {}
quality: {}
features: {}
`;

      const result = service.importProfile(yaml, 'yaml');

      expect(result.success).toBe(true);
      expect(result.profile?.id).toBe('yaml-bank');
      expect(service.getProfile('yaml-bank')).toBeDefined();
    });
  });
});
