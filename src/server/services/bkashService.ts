// bKash Merchant Payment Gateway Service (Tokenized Checkout v2.0.0-beta)
import crypto from 'crypto';

export interface BkashTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface BkashCreateResponse {
  statusCode: string;
  statusMessage: string;
  paymentID?: string;
  bkashURL?: string;
  callbackURL?: string;
  amount?: string;
  currency?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

export interface BkashExecuteResponse {
  statusCode: string;
  statusMessage: string;
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: string;
  currency?: string;
  merchantInvoiceNumber?: string;
  payerReference?: string;
  customerMsisdn?: string;
}

export interface BkashVerificationResult {
  success: boolean;
  paymentID?: string;
  trxID?: string;
  transactionStatus?: string;
  amount?: number;
  currency?: string;
  merchantInvoiceNumber?: string;
  message?: string;
}

class BkashService {
  private getBaseUrl(sandbox = true): string {
    return sandbox
      ? 'https://tokenized.sandbox.bka.sh/v2.0.0-beta'
      : 'https://tokenized.pay.bka.sh/v2.0.0-beta';
  }

  isConfigured(): boolean {
    const credentials = [
      process.env.BKASH_APP_KEY,
      process.env.BKASH_APP_SECRET,
      process.env.BKASH_USERNAME,
      process.env.BKASH_PASSWORD,
    ];
    return credentials.every(
      (credential) =>
        Boolean(credential?.trim()) &&
        !/placeholder|your_/i.test(credential || '') &&
        !/^bkash_(app_key|app_secret|merchant_username|merchant_password)$/i.test(credential || '')
    );
  }

  /**
   * 1. Grant Token: Exchanges appKey & appSecret for bearer id_token
   */
  async grantToken(sandbox = true): Promise<{ success: boolean; id_token?: string; message?: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'bKash live merchant credentials (BKASH_APP_KEY, BKASH_APP_SECRET, etc.) are not configured in environment.',
      };
    }

    try {
      const url = `${this.getBaseUrl(sandbox)}/tokenized/checkout/token/grant`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          username: process.env.BKASH_USERNAME!,
          password: process.env.BKASH_PASSWORD!,
        },
        body: JSON.stringify({
          app_key: process.env.BKASH_APP_KEY!,
          app_secret: process.env.BKASH_APP_SECRET!,
        }),
      });

      const data: BkashTokenResponse = await res.json();
      if (res.ok && data.id_token) {
        return { success: true, id_token: data.id_token };
      }
      return { success: false, message: data.statusMessage || 'Failed to grant bKash token' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * 2. Create Payment: Initializes a hosted checkout session with bKash
   */
  async createPayment(params: {
    orderNumber: string;
    amount: number;
    customerPhone: string;
    callbackUrl: string;
    sandbox?: boolean;
  }): Promise<{ success: boolean; paymentID?: string; bkashURL?: string; message?: string }> {
    const sandbox = params.sandbox ?? true;
    const tokenRes = await this.grantToken(sandbox);
    if (!tokenRes.success || !tokenRes.id_token) {
      return { success: false, message: tokenRes.message || 'bKash authentication failed' };
    }

    try {
      const url = `${this.getBaseUrl(sandbox)}/tokenized/checkout/create`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRes.id_token}`,
          'X-APP-Key': process.env.BKASH_APP_KEY!,
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: params.customerPhone,
          callbackURL: params.callbackUrl,
          amount: params.amount.toFixed(2),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: params.orderNumber,
        }),
      });

      const data: BkashCreateResponse = await res.json();
      const amountMatches =
        Number.isFinite(Number(data.amount)) &&
        Math.round(Number(data.amount) * 100) === Math.round(params.amount * 100);
      if (
        res.ok &&
        data.statusCode === '0000' &&
        data.paymentID &&
        data.bkashURL &&
        data.currency === 'BDT' &&
        data.merchantInvoiceNumber === params.orderNumber &&
        amountMatches
      ) {
        return { success: true, paymentID: data.paymentID, bkashURL: data.bkashURL };
      }
      return { success: false, message: data.statusMessage || 'Failed to create bKash checkout session' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * 3. Execute Payment: Server-to-server verification after customer PIN/OTP authorization
   */
  async executePayment(paymentID: string, sandbox = true): Promise<{
    success: boolean;
    paymentID?: string;
    trxID?: string;
    transactionStatus?: string;
    amount?: number;
    currency?: string;
    merchantInvoiceNumber?: string;
    message?: string;
  }> {
    const tokenRes = await this.grantToken(sandbox);
    if (!tokenRes.success || !tokenRes.id_token) {
      return { success: false, message: tokenRes.message };
    }

    try {
      const url = `${this.getBaseUrl(sandbox)}/tokenized/checkout/execute`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRes.id_token}`,
          'X-APP-Key': process.env.BKASH_APP_KEY!,
        },
        body: JSON.stringify({ paymentID }),
      });

      const data: BkashExecuteResponse = await res.json();
      if (res.ok && data.statusCode === '0000' && data.transactionStatus === 'Completed') {
        return {
          success: true,
          paymentID: data.paymentID,
          trxID: data.trxID,
          transactionStatus: data.transactionStatus,
          amount: Number(data.amount),
          currency: data.currency,
          merchantInvoiceNumber: data.merchantInvoiceNumber,
        };
      }
      return {
        success: false,
        message: data.statusMessage || `bKash execution failed with status: ${data.statusCode}`,
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * 4. Query Payment: Check transaction status directly
   */
  async queryPayment(paymentID: string, sandbox = true): Promise<BkashVerificationResult> {
    const tokenRes = await this.grantToken(sandbox);
    if (!tokenRes.success || !tokenRes.id_token) {
      return { success: false, message: tokenRes.message };
    }

    try {
      const url = `${this.getBaseUrl(sandbox)}/tokenized/checkout/payment/status`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRes.id_token}`,
          'X-APP-Key': process.env.BKASH_APP_KEY!,
        },
        body: JSON.stringify({ paymentID }),
      });

      const data: BkashExecuteResponse = await res.json();
      if (res.ok && data.statusCode === '0000' && data.transactionStatus === 'Completed') {
        return {
          success: true,
          paymentID: data.paymentID,
          trxID: data.trxID,
          transactionStatus: data.transactionStatus,
          amount: Number(data.amount),
          currency: data.currency,
          merchantInvoiceNumber: data.merchantInvoiceNumber,
        };
      }
      return { success: false, message: data.statusMessage || 'Payment not completed' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  /**
   * 5. Refund Payment: Process server-side refund through bKash Tokenized Checkout API
   */
  async refundPayment(params: {
    paymentID: string;
    trxID: string;
    amount: number;
    sku?: string;
    reason?: string;
    sandbox?: boolean;
  }): Promise<{
    success: boolean;
    refundTrxID?: string;
    transactionStatus?: string;
    message?: string;
  }> {
    const sandbox = params.sandbox ?? true;
    const tokenRes = await this.grantToken(sandbox);
    if (!tokenRes.success || !tokenRes.id_token) {
      return { success: false, message: tokenRes.message };
    }

    try {
      const url = `${this.getBaseUrl(sandbox)}/tokenized/checkout/payment/refund`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRes.id_token}`,
          'X-APP-Key': process.env.BKASH_APP_KEY!,
        },
        body: JSON.stringify({
          paymentID: params.paymentID,
          trxID: params.trxID,
          amount: params.amount.toFixed(2),
          sku: params.sku || 'REFUND-ALL',
          reason: params.reason || 'Customer requested order return/refund',
        }),
      });

      const data = await res.json();
      if (res.ok && data.statusCode === '0000' && data.refundTrxID) {
        return {
          success: true,
          refundTrxID: data.refundTrxID,
          transactionStatus: data.transactionStatus,
          message: 'bKash refund executed successfully',
        };
      }
      return {
        success: false,
        message: data.statusMessage || `bKash refund rejected with code ${data.statusCode}`,
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const bkashService = new BkashService();
