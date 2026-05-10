import { Injectable, Logger } from '@nestjs/common';
import { BankProfile } from './bank-profile.service';

export interface ProfileValidationError {
  field: string;
  message: string;
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: ProfileValidationError[];
  profile?: BankProfile;
}

export interface HotReloadConfig {
  enabled: boolean;
  debounceMs: number;
  watchDirectory: string;
  backupCount: number;
  maxFileSize: number;
}

export interface UpdateConfigDto {
  enabled?: boolean;
  debounceMs?: number;
  watchDirectory?: string;
  backupCount?: number;
  maxFileSize?: number;
}

@Injectable()
export class ProfileConfigService {
  private readonly logger = new Logger(ProfileConfigService.name);
  private readonly profiles = new Map<string, BankProfile>();
  private activeProfileId?: string;
  private backupCount = 0;

  private hotReloadConfig: HotReloadConfig = {
    enabled: false,
    debounceMs: 500,
    watchDirectory: 'config/bank-profiles',
    backupCount: 5,
    maxFileSize: 10 * 1024 * 1024,
  };

  saveProfileToFile(
    profile: BankProfile,
    _filePath?: string,
  ): {
    success: boolean;
    message: string;
    path?: string;
    profile?: BankProfile;
  } {
    if (!(profile.id && profile.name)) {
      return { success: false, message: 'Profile must have id and name' };
    }

    this.profiles.set(profile.id, {
      ...profile,
      lastUpdated: profile.lastUpdated ?? new Date().toISOString(),
    });
    this.logger.debug(`Saved profile ${profile.id}`);
    return {
      success: true,
      message: 'Profile saved',
      path: `memory://${profile.id}`,
      profile,
    };
  }

  getProfileDetails(id: string): ProfileValidationResult | null {
    const profile = this.profiles.get(id);
    if (!profile) {
      return null;
    }

    const validation = this.validateProfile(profile);
    return {
      isValid: validation.length === 0,
      errors: validation,
      profile,
    };
  }

  deleteProfileFile(id: string): { success: boolean; message: string } {
    if (!this.profiles.has(id)) {
      return { success: false, message: `Profile not found: ${id}` };
    }
    this.profiles.delete(id);
    return { success: true, message: 'Profile deleted' };
  }

  setActiveProfile(body: { profileId: string }): {
    success: boolean;
    message: string;
  } {
    if (!this.profiles.has(body.profileId)) {
      return {
        success: false,
        message: `Profile not found: ${body.profileId}`,
      };
    }
    this.activeProfileId = body.profileId;
    return { success: true, message: 'Active profile set' };
  }

  getActiveProfile(): { profileId?: string } | null {
    return this.activeProfileId ? { profileId: this.activeProfileId } : null;
  }

  createBackup(_body?: { profileId?: string }): {
    success: boolean;
    message: string;
    backupCount: number;
    timestamp: string;
  } {
    this.backupCount += 1;
    return {
      success: true,
      message: 'Backup created in memory',
      backupCount: this.backupCount,
      timestamp: new Date().toISOString(),
    };
  }

  getConfigHealth(): {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
  } {
    const issues: string[] = [];
    if (this.profiles.size === 0) {
      issues.push('No profiles loaded');
    }
    const status: 'healthy' | 'warning' | 'error' = issues.length === 0 ? 'healthy' : 'warning';
    return { status, issues };
  }

  getDiagnostics(): Record<string, unknown> {
    return {
      profileCount: this.profiles.size,
      activeProfileId: this.activeProfileId,
      backups: this.backupCount,
      hotReload: this.hotReloadConfig.enabled,
    };
  }

  getCurrentSchema(): Record<string, unknown> {
    return {
      id: 'string',
      name: 'string',
      country: 'string',
      currency: 'string',
      parsing: 'object',
    };
  }

  updateHotReloadConfig(config: UpdateConfigDto): HotReloadConfig {
    this.hotReloadConfig = { ...this.hotReloadConfig, ...config };
    return this.hotReloadConfig;
  }

  private validateProfile(profile: BankProfile): ProfileValidationError[] {
    const errors: ProfileValidationError[] = [];
    if (!profile.id) {
      errors.push({ field: 'id', message: 'id is required' });
    }
    if (!profile.name) {
      errors.push({ field: 'name', message: 'name is required' });
    }
    if (!profile.country) {
      errors.push({ field: 'country', message: 'country is required' });
    }
    if (!profile.currency) {
      errors.push({ field: 'currency', message: 'currency is required' });
    }
    return errors;
  }
}
