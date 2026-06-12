import { BadRequestException } from '@nestjs/common';
import {
  assertPublicEgressHost,
  assertPublicEgressUrl,
  isBlockedEgressAddress,
} from '@/common/utils/egress-url.util';

describe('egress-url.util', () => {
  it.each(['127.0.0.1', '10.0.0.5', '172.16.1.1', '192.168.1.20', '169.254.169.254', '::1'])(
    'blocks private or local address %s',
    address => {
      expect(isBlockedEgressAddress(address)).toBe(true);
    },
  );

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])(
    'allows public address %s',
    address => {
      expect(isBlockedEgressAddress(address)).toBe(false);
    },
  );

  it('rejects private literal URL hosts before any network request', async () => {
    await expect(assertPublicEgressUrl('http://169.254.169.254/latest')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects resolved private DNS addresses', async () => {
    await expect(
      assertPublicEgressHost('metadata.google.internal', {
        lookup: jest.fn().mockResolvedValue([{ address: '169.254.169.254' }]),
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
