# P0 Refactor Foundations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce the highest-value backend duplication by extracting shared OAuth/cloud-storage foundations and consolidating duplicated receipt parsing utilities without changing behavior.

**Architecture:** Introduce a reusable OAuth integration base below the existing cloud-storage base, then move duplicated Dropbox/Google Drive and Gmail OAuth flow pieces onto that foundation. In parallel, collapse duplicated receipt utility layers so Gmail and universal extraction call shared helpers directly instead of wrapping identical logic.

**Tech Stack:** NestJS, TypeORM, Jest, TypeScript, Biome

---

### Task 1: Extract OAuth Integration Base Service

**Files:**
- Create: `backend/src/common/services/oauth-integration-base.service.ts`
- Modify: `backend/src/common/services/cloud-storage-base.service.ts`
- Test: `backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`
- Test: `backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts` with a minimal test subclass that verifies the extracted base still:

```ts
it('builds and parses signed OAuth state', () => {
  const state = service.exposeBuildState({ userId: 'user-1', workspaceId: 'ws-1' });

  expect(service.exposeParseState(state)).toEqual({
    userId: 'user-1',
    workspaceId: 'ws-1',
  });
});

it('finds the integration by provider and settings relation', async () => {
  userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
  integrationRepository.findOne.mockResolvedValue({ id: 'integration-1' });

  await expect(service.findIntegrationForUser('user-1')).resolves.toEqual({
    integration: { id: 'integration-1' },
    workspaceId: 'ws-1',
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts`

Expected: FAIL with module not found for `oauth-integration-base.service.ts`.

**Step 3: Write minimal implementation**

Create `OAuthIntegrationBaseService<TSettings>` and move these methods out of `CloudStorageBaseService` into it:

```ts
protected buildState(payload: Record<string, unknown>): string
protected parseState(state: string): Record<string, unknown>
protected async getWorkspaceId(userId: string): Promise<string | null>
public async findIntegrationForUser(userId: string)
public async ensureIntegration(userId: string)
protected async ensureValidAccessToken(integration: Integration): Promise<string>
private base64UrlEncode(value: string): string
private base64UrlDecode(value: string): string
private signState(payload: string): string
```

`CloudStorageBaseService<TSettings>` should then extend the new base and keep only cloud-storage-specific behavior.

**Step 4: Run targeted tests**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/common/services/oauth-integration-base.service.ts backend/src/common/services/cloud-storage-base.service.ts backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts
git commit -m "refactor(auth): extract shared oauth integration base"
```

### Task 2: Rebase Gmail OAuth Service on the Shared OAuth Base

**Files:**
- Modify: `backend/src/modules/gmail/services/gmail-oauth.service.ts:24-390`
- Modify: `backend/src/modules/gmail/gmail.module.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts`

**Step 1: Write the failing test**

Create `backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts` covering the inherited behavior that currently lives inline:

```ts
it('reuses signed state helpers when building the auth url', () => {
  const url = service.getAuthUrl({ id: 'user-1', workspaceId: 'ws-1' } as User);

  expect(url).toContain('state=');
});

it('disconnects gmail integration and clears token plus settings', async () => {
  integrationRepository.findOne.mockResolvedValue({
    id: 'integration-1',
    token: { integrationId: 'integration-1' },
    gmailSettings: { integrationId: 'integration-1' },
  });

  await service.disconnect('user-1');

  expect(integrationTokenRepository.delete).toHaveBeenCalledWith({ integrationId: 'integration-1' });
  expect(gmailSettingsRepository.delete).toHaveBeenCalledWith({ integrationId: 'integration-1' });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts`

Expected: FAIL because the current service does not expose the inherited structure the new test expects.

**Step 3: Write minimal implementation**

Update `GmailOAuthService` to extend the new base:

```ts
export class GmailOAuthService extends OAuthIntegrationBaseService<GmailSettings> {
  protected getProvider(): IntegrationProvider {
    return IntegrationProvider.GMAIL;
  }

  protected getSettingsRelationName(): keyof Integration {
    return 'gmailSettings';
  }

  protected getStateSecret(): string {
    return process.env.GMAIL_STATE_SECRET || process.env.JWT_SECRET || 'lumio-state';
  }
}
```

Move duplicated `buildState`, `parseState`, `getWorkspaceId`, `findIntegrationForUser`, and `ensureIntegration` usage onto inherited methods. Keep Gmail-specific behavior in:

```ts
getAuthUrl(user: User): string
handleCallback(params)
getGmailClient(userId: string)
disconnect(userId: string)
```

Add an overridable hook if needed so Gmail can still delete `gmailSettings` on disconnect.

**Step 4: Run targeted tests**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/modules/gmail/services/gmail-oauth.service.ts backend/src/modules/gmail/gmail.module.ts backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts
git commit -m "refactor(gmail): reuse oauth integration base"
```

### Task 3: Remove Cloud Storage Dead Overrides and Share Import DTO

**Files:**
- Create: `backend/src/common/dto/import-cloud-files.dto.ts`
- Modify: `backend/src/modules/dropbox/dropbox.service.ts:288-304`
- Modify: `backend/src/modules/google-drive/google-drive.service.ts:268-290`
- Modify: `backend/src/modules/dropbox/dto/import-dropbox-files.dto.ts`
- Modify: `backend/src/modules/google-drive/dto/import-drive-files.dto.ts`
- Modify: `backend/src/common/services/cloud-storage-base.service.ts:189-193`
- Test: `backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`

**Step 1: Write the failing test**

Add to `backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`:

```ts
it('exposes picker token without subclass override', async () => {
  userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
  integrationRepository.findOne.mockResolvedValue({
    id: 'integration-1',
    provider: IntegrationProvider.DROPBOX,
    status: IntegrationStatus.CONNECTED,
    token: {
      accessToken: encryptText('access-1'),
      refreshToken: encryptText('refresh-1'),
      expiresAt: new Date(Date.now() + 3_600_000),
    },
    dropboxSettings: null,
  });

  await expect(service.getPickerToken('user-1')).resolves.toEqual({ accessToken: 'access-1' });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`

Expected: if behavior regresses during cleanup, this catches it before service overrides are removed.

**Step 3: Write minimal implementation**

Create the shared DTO:

```ts
export class ImportCloudFilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  fileIds: string[];
}
```

Then switch provider DTO files to re-export it:

```ts
export { ImportCloudFilesDto as ImportDropboxFilesDto } from '@/common/dto/import-cloud-files.dto';
export { ImportCloudFilesDto as ImportDriveFilesDto } from '@/common/dto/import-cloud-files.dto';
```

Delete redundant methods from both services:

```ts
async updateSettings(userId: string, dto: UpdateCloudSettingsDto) {
  return super.updateSettings(userId, dto);
}

async getPickerToken(userId: string) {
  return super.getPickerToken(userId);
}
```

If duplicated constants are still shadowed in subclasses, remove them and use the base definition.

**Step 4: Run targeted tests**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/common/dto/import-cloud-files.dto.ts backend/src/modules/dropbox/dto/import-dropbox-files.dto.ts backend/src/modules/google-drive/dto/import-drive-files.dto.ts backend/src/modules/dropbox/dropbox.service.ts backend/src/modules/google-drive/google-drive.service.ts backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts
git commit -m "refactor(storage): remove redundant cloud overrides"
```

### Task 4: Template Shared OAuth Callback and Auth URL Flow

**Files:**
- Modify: `backend/src/common/services/oauth-integration-base.service.ts`
- Modify: `backend/src/common/services/cloud-storage-base.service.ts`
- Modify: `backend/src/modules/google-drive/google-drive.service.ts:152-266`
- Modify: `backend/src/modules/dropbox/dropbox.service.ts:154-286`
- Modify: `backend/src/modules/gmail/services/gmail-oauth.service.ts:140-269`
- Test: `backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts`

**Step 1: Write the failing test**

Add callback-focused base tests around a fake subclass:

```ts
it('creates integration, token, and settings from callback exchange', async () => {
  userRepository.findOne.mockResolvedValue({ id: 'user-1', workspaceId: 'ws-1' });
  exchangeCodeMock.mockResolvedValue({ accessToken: 'access-1', refreshToken: 'refresh-1' });

  const result = await service.handleOAuthCallback({ code: 'code-1', state: signedState });

  expect(integrationRepository.save).toHaveBeenCalled();
  expect(integrationTokenRepository.save).toHaveBeenCalled();
  expect(settingsRepository.save).toHaveBeenCalled();
  expect(result.redirectUrl).toContain('/settings/integrations');
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts`

Expected: FAIL because `handleOAuthCallback()` is not generalized yet.

**Step 3: Write minimal implementation**

Add shared template methods like:

```ts
getAuthUrl(user: User): string
protected abstract getScopes(): string[]
protected abstract exchangeCodeForTokens(code: string): Promise<TokenExchangeResult>
protected abstract extractGrantedScopes(result: TokenExchangeResult): string[]
protected abstract upsertProviderSettings(integration: Integration): Promise<void>
async handleOAuthCallback(params: { code?: string; state?: string; error?: string })
```

Move duplicated flow from Dropbox, Google Drive, and Gmail into the base. Keep only provider-specific token exchange and settings creation in subclasses.

**Step 4: Run targeted tests**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/common/services/oauth-integration-base.service.ts backend/src/common/services/cloud-storage-base.service.ts backend/src/modules/google-drive/google-drive.service.ts backend/src/modules/dropbox/dropbox.service.ts backend/src/modules/gmail/services/gmail-oauth.service.ts backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts
git commit -m "refactor(auth): share oauth callback template"
```

### Task 5: Template Shared Cloud Storage Import and Sync Flow

**Files:**
- Modify: `backend/src/common/services/cloud-storage-base.service.ts:119-228`
- Modify: `backend/src/modules/dropbox/dropbox.service.ts:334-573`
- Modify: `backend/src/modules/google-drive/google-drive.service.ts:314-531`
- Test: `backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts`
- Test: `backend/@tests/unit/modules/dropbox/dropbox.service.spec.ts`
- Test: `backend/@tests/unit/modules/google-drive/google-drive.service.spec.ts`

**Step 1: Write the failing test**

Create provider-specific tests that pin the shared behavior rather than SDK details:

```ts
it('rejects imports for unsupported mime type', async () => {
  fetchMetadataMock.mockResolvedValue({ name: 'notes.txt', mimeType: 'text/plain', size: 10 });

  const result = await service.importFiles('user-1', { fileIds: ['file-1'] });

  expect(result[0]).toMatchObject({ success: false, error: expect.stringContaining('Unsupported') });
});

it('uploads only statements that are due for sync', async () => {
  await service.syncIntegration(integration);

  expect(uploadFileMock).toHaveBeenCalledTimes(1);
  expect(auditService.log).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/modules/dropbox/dropbox.service.spec.ts backend/@tests/unit/modules/google-drive/google-drive.service.spec.ts`

Expected: FAIL or require new tests, proving the shared template is not in place yet.

**Step 3: Write minimal implementation**

Move the shared loop into `CloudStorageBaseService` using abstract hooks:

```ts
protected abstract getAuthenticatedClient(integration: Integration): Promise<unknown>
protected abstract fetchRemoteFileMetadata(client: unknown, fileId: string): Promise<RemoteFileMetadata>
protected abstract downloadRemoteFile(client: unknown, fileId: string): Promise<Buffer>
protected abstract ensureDefaultFolder(integration: Integration, settings: TSettings): Promise<void>
protected abstract resolveRemoteFilename(client: unknown, settings: TSettings, filename: string): Promise<string>
protected abstract uploadRemoteFile(client: unknown, settings: TSettings, filename: string, content: Buffer): Promise<void>
```

The base should own:

```ts
async importFiles(userId: string, dto: ImportCloudFilesDto)
async syncNow(userId: string)
async syncIntegration(integration: Integration)
```

Keep only SDK-specific metadata lookup, download, folder creation, and upload implementation in subclasses.

**Step 4: Run targeted tests**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts backend/@tests/unit/modules/dropbox/dropbox.service.spec.ts backend/@tests/unit/modules/google-drive/google-drive.service.spec.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/src/common/services/cloud-storage-base.service.ts backend/src/modules/dropbox/dropbox.service.ts backend/src/modules/google-drive/google-drive.service.ts backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts backend/@tests/unit/modules/dropbox/dropbox.service.spec.ts backend/@tests/unit/modules/google-drive/google-drive.service.spec.ts
git commit -m "refactor(storage): share import and sync pipeline"
```

### Task 6: Collapse Duplicated Receipt Utility Layers

**Files:**
- Modify: `backend/src/common/utils/receipt-extraction.util.ts:1-103`
- Modify: `backend/src/common/utils/receipt-amount.util.ts:14-234`
- Delete: `backend/src/common/utils/receipt-text.util.ts`
- Modify: `backend/src/common/utils/sender-brand.util.ts`
- Modify: `backend/src/modules/gmail/services/gmail-receipt-parser.service.ts:415-590`
- Modify: `backend/src/modules/parsing/services/universal-extractor.service.ts:290-615`
- Test: `backend/@tests/unit/common/utils/receipt-extraction.util.spec.ts`
- Test: `backend/@tests/unit/common/utils/receipt-amount.util.spec.ts`
- Test: `backend/@tests/unit/common/utils/receipt-text.util.spec.ts`
- Test: `backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts`
- Test: `backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts`

**Step 1: Write the failing test**

Move the `receipt-text` expectations into `receipt-extraction.util.spec.ts` first:

```ts
it('combines the guards for line-item filtering', () => {
  expect(shouldSkipLineItem('Thanks for your purchase!', 202.0, false)).toBe(true);
  expect(shouldSkipLineItem('GitHub Actions', 10.0, false)).toBe(false);
});
```

Add a regression test proving Gmail and universal extractor can still use the same helpers directly:

```ts
it('extracts line items without wrapper helper methods', async () => {
  const lineItems = await (service as any).extractLineItems('GitHub Actions 10.00');

  expect(lineItems).toEqual([{ description: 'GitHub Actions', amount: 10 }]);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/utils/receipt-extraction.util.spec.ts backend/@tests/unit/common/utils/receipt-text.util.spec.ts backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts`

Expected: FAIL once tests are moved before the implementation is consolidated.

**Step 3: Write minimal implementation**

Move or add these helpers in `receipt-extraction.util.ts`:

```ts
export const shouldSkipLineItem = (description: string, amount: number, hasExplicitCurrency: boolean) =>
  isLikelySentence(description) ||
  isDateRangeLike(description) ||
  isAddressLike(description) ||
  isYearLikeAmount(amount, hasExplicitCurrency);

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

Then:
- delete duplicated functions from `receipt-text.util.ts`
- remove unused `scoreAmountCandidate` duplication from `receipt-amount.util.ts`
- remove unused exported `extractAmountWithCurrency` from `receipt-amount.util.ts` if no call sites remain
- replace identical Gmail/universal private wrappers with direct imports and calls to shared utils

**Step 4: Run targeted tests**

Run: `npm run test:unit -- --runInBand backend/@tests/unit/common/utils/receipt-extraction.util.spec.ts backend/@tests/unit/common/utils/receipt-amount.util.spec.ts backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts`

Expected: PASS. `receipt-text.util.spec.ts` should be removed or replaced by the migrated extraction util coverage.

**Step 5: Commit**

```bash
git add backend/src/common/utils/receipt-extraction.util.ts backend/src/common/utils/receipt-amount.util.ts backend/src/common/utils/sender-brand.util.ts backend/src/modules/gmail/services/gmail-receipt-parser.service.ts backend/src/modules/parsing/services/universal-extractor.service.ts backend/@tests/unit/common/utils/receipt-extraction.util.spec.ts backend/@tests/unit/common/utils/receipt-amount.util.spec.ts backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts
git rm backend/src/common/utils/receipt-text.util.ts backend/@tests/unit/common/utils/receipt-text.util.spec.ts
git commit -m "refactor(receipts): consolidate shared parsing utilities"
```

### Task 7: Final Verification and Cleanup

**Files:**
- Modify: `docs/plans/2026-04-04-p0-refactor-foundations.md`
- Modify: any touched files from Tasks 1-6 if verification finds issues

**Step 1: Run targeted verification**

Run:

```bash
npm run test:unit -- --runInBand backend/@tests/unit/common/services/oauth-integration-base.service.spec.ts backend/@tests/unit/common/services/cloud-storage-base.service.spec.ts backend/@tests/unit/modules/gmail/gmail-oauth.service.spec.ts backend/@tests/unit/modules/gmail/gmail-receipt-parser.service.spec.ts backend/@tests/unit/modules/parsing/services/universal-extractor.service.spec.ts backend/@tests/unit/common/utils/receipt-extraction.util.spec.ts backend/@tests/unit/common/utils/receipt-amount.util.spec.ts
```

Expected: PASS.

**Step 2: Run repository-level checks for modified backend code**

Run:

```bash
npm run lint:check
npm run typecheck
```

Expected: PASS.

**Step 3: Measure duplication again**

Run:

```bash
jscpd backend/src --reporters consoleFull --min-lines 5 --min-tokens 50 --format typescript
```

Expected: lower duplication count in:
- `modules/dropbox/dropbox.service.ts`
- `modules/google-drive/google-drive.service.ts`
- `modules/gmail/services/gmail-oauth.service.ts`
- `modules/gmail/services/gmail-receipt-parser.service.ts`
- `modules/parsing/services/universal-extractor.service.ts`
- `common/utils/receipt-*.ts`

**Step 4: Commit final cleanup if needed**

```bash
git add .
git commit -m "chore(refactor): verify p0 duplication reduction"
```
