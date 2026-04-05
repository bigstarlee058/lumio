import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import type { Branch } from '../../../entities/branch.entity';
import type { Category } from '../../../entities/category.entity';
import type { Transaction } from '../../../entities/transaction.entity';
import type { Wallet } from '../../../entities/wallet.entity';
import {
  createSheetWriteContext,
  isRetryableCredentialError,
  mapTransactionsToValues,
} from './google-sheets-api.util';

interface SheetRow {
  monthText: string; // Month (text representation)
  year: number; // Year
  monthNumber: number; // Month (numeric representation)
  transactionDate: string; // Transaction date
  amountKZT: number; // Amount in KZT
  amountForeign: number | null; // Amount in foreign currency
  currencyCode: string; // Currency code
  exchangeRate: number | null; // Exchange rate
  wallet: string | null; // Wallet
  branch: string | null; // Branch
  article: string | null; // Article/Category
  counterparty: string; // Counterparty
  paymentPurpose: string; // Payment purpose
  comments: string | null; // Comments
  activityType: string | null; // Activity type
  transactionType: string; // Transaction type (income/expense)
  usdRate: number | null; // USD Rate
  rubRate: number | null; // RUB Rate
}

type RefreshTokenError = {
  response?: {
    data?: {
      error_description?: string;
    };
  };
  message?: string;
};

type GoogleSheetsError = { code?: number; message?: string };
type SheetCellValue = string | number | boolean | null;
type SheetValues = SheetCellValue[][];

interface RefreshTokenResponse {
  tokens?: { access_token?: string | null };
  access_token?: string | null;
}

interface OAuth2ClientWithRefreshTokenMethod {
  refreshToken(refreshToken?: string | null): Promise<RefreshTokenResponse>;
}

@Injectable()
export class GoogleSheetsApiService {
  private readonly logger = new Logger(GoogleSheetsApiService.name);
  private readonly oauth2Client: OAuth2Client;

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getGoogleSheetsError(error: unknown): GoogleSheetsError {
    if (typeof error === 'object' && error !== null) {
      return error as GoogleSheetsError;
    }
    return { message: this.getErrorMessage(error) };
  }

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri =
      this.configService.get<string>('GOOGLE_SHEETS_REDIRECT_URI') ||
      this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!clientId || !clientSecret) {
      this.logger.warn('Google OAuth credentials not configured');
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    if (!refreshToken || refreshToken.includes('placeholder')) {
      throw new BadRequestException('Отсутствует валидный refresh token Google');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const tokenResponse = await (
        this.oauth2Client as unknown as OAuth2ClientWithRefreshTokenMethod
      ).refreshToken(refreshToken);
      const accessToken =
        tokenResponse.tokens?.access_token || tokenResponse.access_token;
      if (!accessToken) {
        throw new Error('Access token не получен при обновлении');
      }
      return accessToken;
    } catch (error) {
      const refreshError = error as RefreshTokenError;
      this.logger.error('Error refreshing access token:', error);
      throw new BadRequestException(
        refreshError.response?.data?.error_description ||
          refreshError.message ||
          'Failed to refresh Google access token',
      );
    }
  }

  /**
   * Get authenticated Google Sheets client
   */
  private getSheetsClient(accessToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
    });

    return google.sheets({ version: 'v4', auth: this.oauth2Client });
  }

  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      include_granted_scopes: true,
      state,
    });
  }

  async exchangeCodeForTokens(
    code: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      const accessToken = tokens.access_token || '';
      const refreshToken = tokens.refresh_token || '';

      if (!refreshToken) {
        this.logger.warn('No refresh token returned by Google. Prompt might need consent.');
      }

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to exchange OAuth code for tokens:', error);
      throw new BadRequestException('Не удалось обменять код авторизации Google');
    }
  }

  async getSpreadsheetInfo(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<{ title?: string; firstWorksheet?: string }> {
    const sheets = this.getSheetsClient(accessToken);
    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
      });
      const title = response.data.properties?.title;
      const firstWorksheet = response.data.sheets?.[0]?.properties?.title;
      return { title, firstWorksheet };
    } catch (error) {
      this.logger.error('Failed to read spreadsheet info:', error);
      throw new BadRequestException('Не удалось прочитать Google Sheet. Проверьте права доступа.');
    }
  }

  async getUserInfo(accessToken: string): Promise<{ email: string | null }> {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const response = await oauth2.userinfo.get();
      return {
        email: response.data.email || null,
      };
    } catch (error) {
      this.logger.warn('Failed to read Google account info', error);
      return { email: null };
    }
  }

  async listWorksheets(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<Array<{ title: string; index: number; rowCount: number; columnCount: number }>> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets(properties(title,index,gridProperties(rowCount,columnCount)))',
      });

      return (response.data.sheets || []).map(sheet => ({
        title: sheet.properties?.title || 'Sheet1',
        index: sheet.properties?.index || 0,
        rowCount: sheet.properties?.gridProperties?.rowCount || 0,
        columnCount: sheet.properties?.gridProperties?.columnCount || 0,
      }));
    } catch (error) {
      this.logger.error('Failed to list worksheets:', error);
      throw new BadRequestException('Не удалось получить список листов Google Sheets.');
    }
  }

  /**
   * Map Transaction entity to SheetRow format
   */
  private mapTransactionToRow(
    transaction: Transaction,
    category: Category | null,
    branch: Branch | null,
    wallet: Wallet | null,
  ): SheetRow {
    const date = new Date(transaction.transactionDate);
    const monthNames = [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ];

    // Determine amount in KZT
    const amountKZT = transaction.amount || transaction.debit || transaction.credit || 0;

    // Format date as DD.MM.YYYY
    const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

    return {
      monthText: monthNames[date.getMonth()],
      year: date.getFullYear(),
      monthNumber: date.getMonth() + 1,
      transactionDate: formattedDate,
      amountKZT,
      amountForeign: transaction.amountForeign,
      currencyCode: transaction.currency || 'KZT',
      exchangeRate: transaction.exchangeRate,
      wallet: wallet?.name || null,
      branch: branch?.name || null,
      article: transaction.article || category?.name || null,
      counterparty: transaction.counterpartyName,
      paymentPurpose: transaction.paymentPurpose,
      comments: transaction.comments,
      activityType: transaction.activityType,
      transactionType: transaction.transactionType,
      usdRate: null, // TODO: Get from external API or store in transaction
      rubRate: null, // TODO: Get from external API or store in transaction
    };
  }

  /**
   * Convert SheetRow to array of values for Google Sheets
   */
  private rowToValues(row: SheetRow): SheetCellValue[] {
    return [
      row.monthText,
      row.year,
      row.monthNumber,
      row.transactionDate,
      row.amountKZT,
      row.amountForeign,
      row.currencyCode,
      row.exchangeRate,
      row.wallet,
      row.branch,
      row.article,
      row.counterparty,
      row.paymentPurpose,
      row.comments,
      row.activityType,
      row.transactionType,
      row.usdRate,
      row.rubRate,
    ];
  }

  private buildSheetValues(
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
  ): SheetValues {
    return mapTransactionsToValues(
      transactions,
      categories,
      branches,
      wallets,
      (transaction, category, branch, wallet) =>
        this.mapTransactionToRow(transaction, category, branch, wallet),
      row => this.rowToValues(row),
    );
  }

  private getSheetContext(accessToken: string, worksheetName: string | null) {
    return createSheetWriteContext(accessToken, worksheetName, token => this.getSheetsClient(token));
  }

  private async handleSheetWriteError(
    error: { code?: number; message?: string },
    refreshToken: string,
    retry: (accessToken: string) => Promise<void>,
    action: 'write' | 'append',
  ): Promise<void> {
    if (isRetryableCredentialError(error)) {
      this.logger.log('Access token expired, refreshing...');
      const newAccessToken = await this.refreshAccessToken(refreshToken);
      return retry(newAccessToken);
    }

    this.logger.error(`Error ${action}ing to Google Sheet:`, error);
    throw new BadRequestException(`Failed to ${action} to Google Sheet: ${error.message}`);
  }

  private async runTransactionWrite(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    worksheetName: string | null,
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
    action: 'write' | 'append',
    perform: (context: {
      sheets: ReturnType<GoogleSheetsApiService['getSheetsClient']>;
      sheetName: string;
      range: string;
      values: SheetValues;
    }) => Promise<void>,
  ): Promise<void> {
    const { sheets, sheetName, range } = this.getSheetContext(accessToken, worksheetName);

    try {
      const values = this.buildSheetValues(transactions, categories, branches, wallets);
      await perform({ sheets, sheetName, range, values });
      this.logger.log(
        `Successfully ${action === 'write' ? 'wrote' : 'appended'} ${transactions.length} transactions to Google Sheet ${spreadsheetId}`,
      );
    } catch (error) {
      return this.handleSheetWriteError(
        this.getGoogleSheetsError(error),
        refreshToken,
        newAccessToken =>
          this.runTransactionWrite(
            newAccessToken,
            refreshToken,
            spreadsheetId,
            worksheetName,
            transactions,
            categories,
            branches,
            wallets,
            action,
            perform,
          ),
        action,
      );
    }
  }

  /**
   * Find the first empty row in the sheet
   */
  private async findFirstEmptyRow(
    sheets: ReturnType<GoogleSheetsApiService['getSheetsClient']>,
    spreadsheetId: string,
    range: string,
  ): Promise<number> {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const values = response.data.values || [];
      return values.length + 1; // Return next row number (1-indexed)
    } catch (error) {
      this.logger.error('Error finding empty row:', error);
      return 1; // Start from first row if error
    }
  }

  /**
   * Write transactions to Google Sheet
   */
  async writeTransactions(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    worksheetName: string | null,
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
  ): Promise<void> {
    return this.runTransactionWrite(
      accessToken,
      refreshToken,
      spreadsheetId,
      worksheetName,
      transactions,
      categories,
      branches,
      wallets,
      'write',
      async ({ sheets, sheetName, range, values }) => {
        const startRow = await this.findFirstEmptyRow(sheets, spreadsheetId, range);
        const writeRange = `${sheetName}!A${startRow}:S${startRow + values.length - 1}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: writeRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        });
      },
    );
  }

  /**
   * Append transactions to Google Sheet (adds to end without overwriting)
   */
  async appendTransactions(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    worksheetName: string | null,
    transactions: Transaction[],
    categories: Map<string, Category>,
    branches: Map<string, Branch>,
    wallets: Map<string, Wallet>,
  ): Promise<void> {
    return this.runTransactionWrite(
      accessToken,
      refreshToken,
      spreadsheetId,
      worksheetName,
      transactions,
      categories,
      branches,
      wallets,
      'append',
      async ({ sheets, range, values }) => {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values },
        });
      },
    );
  }

  /**
   * Verify access to Google Sheet
   */
  async verifyAccess(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
  ): Promise<boolean> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      await sheets.spreadsheets.get({
        spreadsheetId,
      });
      return true;
    } catch (error) {
      const sheetsError = this.getGoogleSheetsError(error);
      if (sheetsError.code === 401 || sheetsError.message?.includes('Invalid Credentials')) {
        try {
          const newAccessToken = await this.refreshAccessToken(refreshToken);
          const newSheets = this.getSheetsClient(newAccessToken);
          await newSheets.spreadsheets.get({
            spreadsheetId,
          });
          return true;
        } catch (retryError) {
          this.logger.error('Error verifying access after token refresh:', retryError);
          return false;
        }
      }
      this.logger.error('Error verifying access to Google Sheet:', error);
      return false;
    }
  }

  async getValues(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    range: string,
    options?: {
      valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
      dateTimeRenderOption?: 'FORMATTED_STRING' | 'SERIAL_NUMBER';
    },
  ): Promise<{ accessToken: string; range: string; values: SheetValues }> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: options?.valueRenderOption,
        dateTimeRenderOption: options?.dateTimeRenderOption,
      });

      return {
        accessToken,
        range: response.data.range || range,
        values: response.data.values || [],
      };
    } catch (error) {
      const sheetsError = this.getGoogleSheetsError(error);
      if (sheetsError.code === 401 || sheetsError.message?.includes('Invalid Credentials')) {
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        return this.getValues(newAccessToken, refreshToken, spreadsheetId, range, options);
      }

      this.logger.error('Error reading values from Google Sheet:', error);
      throw new BadRequestException(
        `Failed to read Google Sheet values: ${sheetsError.message}`,
      );
    }
  }

  async getGridData(
    accessToken: string,
    refreshToken: string,
    spreadsheetId: string,
    range: string,
    options?: { fields?: string },
  ): Promise<{ accessToken: string; spreadsheet: sheets_v4.Schema$Spreadsheet }> {
    const sheets = this.getSheetsClient(accessToken);

    try {
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [range],
        includeGridData: true,
        fields: options?.fields,
      });

      return {
        accessToken,
        spreadsheet: response.data,
      };
    } catch (error) {
      const sheetsError = this.getGoogleSheetsError(error);
      if (sheetsError.code === 401 || sheetsError.message?.includes('Invalid Credentials')) {
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        return this.getGridData(newAccessToken, refreshToken, spreadsheetId, range, options);
      }

      this.logger.error('Error reading grid data from Google Sheet:', error);
      throw new BadRequestException(
        `Failed to read Google Sheet grid data: ${sheetsError.message}`,
      );
    }
  }
}
