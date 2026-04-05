import { Injectable } from '@nestjs/common';

type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

@Injectable()
export class TimezonesService {
  listTimeZones(): { value: string; label: string }[] {
    try {
      const intlWithSupportedValuesOf = Intl as IntlWithSupportedValuesOf;

      // Check if supportedValuesOf is available (Node 18+)
      if (typeof intlWithSupportedValuesOf.supportedValuesOf !== 'function') {
        return [{ value: 'UTC', label: '(GMT+00:00) UTC' }];
      }

      return intlWithSupportedValuesOf.supportedValuesOf('timeZone').map(tz => {
        const offset = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          timeZoneName: 'longOffset',
        })
          .formatToParts(new Date())
          .find(part => part.type === 'timeZoneName')?.value;

        return {
          value: tz,
          label: `(${offset}) ${tz}`,
        };
      });
    } catch (error) {
      console.error('Error listing timezones:', error);
      return [{ value: 'UTC', label: '(GMT+00:00) UTC' }];
    }
  }
}
