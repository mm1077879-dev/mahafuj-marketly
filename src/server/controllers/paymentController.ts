import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order as OrderModel } from '../models/Order';
import { PaymentTransaction as PaymentTransactionModel } from '../models/PaymentTransaction';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { bkashService } from '../services/bkashService';
import { restoreOrderInventory } from './orderController';
import { canAccessOrder, matchesOrderContact } from '../utils/orderAccess';

const BDT_PER_USD = 120;
const usdToBdtAmount = (usdAmount: number): number =>
  (Math.round(usdAmount * 100) * BDT_PER_USD) / 100;

// 1. Public Payment Gateway Configuration
export const getPaymentConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const config = {
      bkash: {
        enabled: isDbConnected() && memoryStore.paymentSettings.bkashEnabled && bkashService.isConfigured(),
        sandbox: memoryStore.paymentSettings.bkashSandbox,
        isConfigured: bkashService.isConfigured(),
      },
      nagad: {
        enabled: false,
        sandbox: memoryStore.paymentSettings.nagadSandbox,
        isConfigured: false,
      },
      card: { enabled: false, isConfigured: false },
      cod: {
        enabled: memoryStore.paymentSettings.codEnabled,
      },
    };
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Admin Payment Gateway Settings Update
export const updatePaymentConfig = async (req: any, res: Response): Promise<void> => {
  try {
    const { bkashEnabled, bkashSandbox, nagadEnabled, nagadSandbox, codEnabled } = req.body;

    memoryStore.paymentSettings = {
      ...memoryStore.paymentSettings,
      ...(bkashEnabled !== undefined && { bkashEnabled: Boolean(bkashEnabled) }),
      ...(bkashSandbox !== undefined && { bkashSandbox: Boolean(bkashSandbox) }),
      ...(nagadEnabled !== undefined && { nagadEnabled: Boolean(nagadEnabled) }),
      ...(nagadSandbox !== undefined && { nagadSandbox: Boolean(nagadSandbox) }),
      ...(codEnabled !== undefined && { codEnabled: Boolean(codEnabled) }),
    };

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Payment Settings Updated',
      'Gateways',
      'Updated bKash/Nagad/COD commercial gateway settings'
    );

    res.json({ success: true, data: memoryStore.paymentSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Initiate Payment (Authoritative Order Total & Gateway Session Flow)
export const initiatePayment = async (req: any, res: Response): Promise<void> => {
  try {
    const { orderId, paymentMethod, customerPhone } = req.body;

    if (!orderId || !paymentMethod) {
      res.status(400).json({ success: false, message: 'orderId and paymentMethod are required.' });
      return;
    }

    // Locate Order in database or memoryStore
    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findById(orderId);
      if (!order) {
        order = await OrderModel.findOne({ orderNumber: orderId });
      }
    } else {
      order = memoryStore.orders.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
    }

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const user = req.user as { id: string; email: string; role?: string } | undefined;
    const authorized = user
      ? canAccessOrder(order, user)
      : matchesOrderContact(order, {
          email: req.body.customerEmail,
          phone: req.body.customerPhone,
        });
    if (!authorized) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (order.paymentMethod !== paymentMethod) {
      res.status(400).json({ success: false, message: 'Payment method does not match the order.' });
      return;
    }

    if (order.paymentStatus === 'Paid') {
      res.status(400).json({ success: false, message: 'This order is already marked as Paid.' });
      return;
    }

    // Cash on Delivery: Does not require gateway checkout
    if (paymentMethod === 'cod') {
      res.json({
        success: true,
        method: 'cod',
        orderNumber: order.orderNumber,
        status: 'pending_collection',
        message: 'Cash on Delivery order confirmed. Payment will be collected upon courier delivery.',
      });
      return;
    }

    if (paymentMethod !== 'bkash') {
      res.status(503).json({
        success: false,
        message: 'This online payment method is not configured for verified checkout.',
      });
      return;
    }

    if (!isDbConnected()) {
      res.status(503).json({
        success: false,
        message: 'Online payments require persistent database storage. Please use Cash on Delivery.',
      });
      return;
    }

    if (!memoryStore.paymentSettings.bkashEnabled || !bkashService.isConfigured()) {
      res.status(503).json({
        success: false,
        message: 'bKash hosted checkout is unavailable until merchant credentials are configured.',
      });
      return;
    }

    if (order.paymentStatus !== 'Pending' || order.orderStatus !== 'Pending Payment') {
      res.status(409).json({ success: false, message: 'This order is not awaiting online payment.' });
      return;
    }

    const existingAttempt = await PaymentTransactionModel.findOne({
      orderNumber: order.orderNumber,
      provider: 'bkash',
      status: { $in: ['initiated', 'pending'] },
    });
    if (existingAttempt) {
      if (existingAttempt.checkoutUrl && existingAttempt.paymentId?.startsWith('PAY-BKASH-') === false) {
        res.json({
          success: true,
          method: 'bkash',
          paymentId: existingAttempt.paymentId,
          gatewayUrl: existingAttempt.checkoutUrl,
          message: 'Resuming the existing bKash checkout session.',
        });
        return;
      }
      res.status(409).json({
        success: false,
        message: 'A previous payment attempt is unresolved. Do not start another charge; contact support for reconciliation.',
      });
      return;
    }

    const publicOrigin = process.env.APP_URL;
    if (process.env.NODE_ENV === 'production' && !publicOrigin) {
      res.status(503).json({ success: false, message: 'APP_URL must be configured for provider callbacks.' });
      return;
    }
    const origin = publicOrigin || `${req.protocol || 'http'}://${req.get('host') || 'localhost:3000'}`;
    let callbackOrigin: URL;
    try {
      callbackOrigin = new URL(origin);
    } catch {
      res.status(503).json({ success: false, message: 'APP_URL is not a valid public URL.' });
      return;
    }
    if (process.env.NODE_ENV === 'production' && callbackOrigin.protocol !== 'https:') {
      res.status(503).json({ success: false, message: 'APP_URL must use HTTPS in production.' });
      return;
    }
    const callbackUrl = `${callbackOrigin.origin}/api/v1/payments/callback/bkash`;
    const internalPaymentId = `PAY-BKASH-${Date.now().toString(36).toUpperCase()}`;

    const transaction = await PaymentTransactionModel.create({
      orderId: order._id || order.id,
      orderNumber: order.orderNumber,
      provider: 'bkash',
      amount: usdToBdtAmount(Number(order.total)),
      currency: 'BDT',
      paymentId: internalPaymentId,
      status: 'initiated',
      customerPhone: customerPhone || order.shippingAddress?.phone,
    });

    const isSandbox = Boolean(memoryStore.paymentSettings.bkashSandbox);
    const createRes = await bkashService.createPayment({
      orderNumber: order.orderNumber,
      amount: usdToBdtAmount(Number(order.total)),
      customerPhone: customerPhone || order.shippingAddress?.phone,
      callbackUrl,
      sandbox: isSandbox,
    });

    if (!createRes.success || !createRes.paymentID || !createRes.bkashURL) {
      await PaymentTransactionModel.findByIdAndUpdate(transaction._id, { status: 'pending' });
      res.status(502).json({
        success: false,
        message: createRes.message || 'Could not confirm the bKash checkout session. Payment status remains pending.',
      });
      return;
    }

    await PaymentTransactionModel.findByIdAndUpdate(transaction._id, {
      paymentId: createRes.paymentID,
      checkoutUrl: createRes.bkashURL,
      status: 'pending',
    });

    res.json({
      success: true,
      method: 'bkash',
      paymentId: createRes.paymentID,
      mode: isSandbox ? 'sandbox_gateway' : 'live_gateway',
      gatewayUrl: createRes.bkashURL,
      message: 'Continue payment on the hosted bKash checkout.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const completeBkashPayment = async (
  paymentID: string,
  verification: {
    success: boolean;
    paymentID?: string;
    trxID?: string;
    transactionStatus?: string;
    amount?: number;
    currency?: string;
    merchantInvoiceNumber?: string;
  }
): Promise<any | null> => {
  if (
    !isDbConnected() ||
    !verification.success ||
    verification.paymentID !== paymentID ||
    verification.transactionStatus !== 'Completed' ||
    !verification.trxID ||
    verification.currency !== 'BDT' ||
    !Number.isFinite(verification.amount)
  ) {
    return null;
  }

  const session = await mongoose.startSession();
  let completedOrder: any | null = null;
  try {
    await session.withTransaction(async () => {
      const transaction = await PaymentTransactionModel.findOne({
        provider: 'bkash',
        paymentId: paymentID,
      }).session(session);
      if (!transaction || transaction.currency !== 'BDT') return;

      const order = await OrderModel.findOne({ orderNumber: transaction.orderNumber }).session(session);
      if (
        !order ||
        order.paymentMethod !== 'bkash' ||
        verification.merchantInvoiceNumber !== order.orderNumber ||
        Math.round(Number(verification.amount) * 100) !==
          Math.round(usdToBdtAmount(Number(order.total)) * 100) ||
        Math.round(Number(transaction.amount) * 100) !==
          Math.round(usdToBdtAmount(Number(order.total)) * 100)
      ) {
        return;
      }

      if (transaction.status === 'completed') {
        if (transaction.transactionId === verification.trxID && order.paymentStatus === 'Paid') {
          completedOrder = order;
        }
        return;
      }

      if (order.paymentStatus !== 'Pending' || order.orderStatus !== 'Pending Payment') return;

      const duplicateTransaction = await PaymentTransactionModel.findOne({
        transactionId: verification.trxID,
        status: 'completed',
        _id: { $ne: transaction._id },
      }).session(session);
      if (duplicateTransaction) return;

      transaction.transactionId = verification.trxID;
      transaction.status = 'completed';
      await transaction.save({ session });

      order.paymentStatus = 'Paid';
      order.orderStatus = 'Confirmed';
      order.statusHistory.push({
        status: 'Confirmed',
        timestamp: new Date(),
        note: `Payment verified by bKash. Transaction: ${verification.trxID}`,
      });
      await order.save({ session });
      completedOrder = order;
    });
  } finally {
    await session.endSession();
  }
  return completedOrder;
};

// Customer-supplied transaction IDs are never proof of payment; only provider session IDs are verified.
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderNumber, paymentMethod, paymentId } = req.body;
    if (!orderNumber || paymentMethod !== 'bkash' || !paymentId) {
      res.status(400).json({
        success: false,
        message: 'A bKash order number and hosted-checkout payment ID are required.',
      });
      return;
    }
    if (!isDbConnected() || !bkashService.isConfigured()) {
      res.status(503).json({ success: false, message: 'Provider-backed payment verification is unavailable.' });
      return;
    }

    const transaction = await PaymentTransactionModel.findOne({
      orderNumber,
      provider: 'bkash',
      paymentId: String(paymentId),
    });
    if (!transaction) {
      res.status(404).json({ success: false, message: 'No matching bKash checkout session was found.' });
      return;
    }

    const sandbox = Boolean(memoryStore.paymentSettings.bkashSandbox);
    const execution = await bkashService.executePayment(String(paymentId), sandbox);
    const verification = execution.success
      ? execution
      : await bkashService.queryPayment(String(paymentId), sandbox);
    const order = await completeBkashPayment(String(paymentId), verification);
    if (!order) {
      res.status(409).json({
        success: false,
        message: verification.message || 'Payment is not confirmed or does not match this order.',
      });
      return;
    }
    res.json({ success: true, message: 'Payment verified by bKash.', order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Gateway Callback Handlers (server-side provider verification only)
export const handleBkashCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const paymentID = (req.query.paymentID || req.body?.paymentID || '') as string;
    const status = (req.query.status || req.body?.status || '') as string;

    const isSandbox = Boolean(memoryStore.paymentSettings.bkashSandbox);

    if (paymentID && status === 'success' && bkashService.isConfigured() && isDbConnected()) {
      const execution = await bkashService.executePayment(paymentID, isSandbox);
      const verification = execution.success
        ? execution
        : await bkashService.queryPayment(paymentID, isSandbox);
      const order = await completeBkashPayment(paymentID, verification);
      if (order) {
        res.redirect(`/order-success/${order.orderNumber}?provider=bkash`);
        return;
      }
    }

    if (status === 'cancel') {
      res.redirect('/checkout?error=payment_cancelled');
      return;
    }

    res.redirect('/checkout?error=payment_failed');
  } catch (error: any) {
    res.redirect('/checkout?error=callback_processing_failed');
  }
};

export const handleNagadCallback = async (req: Request, res: Response): Promise<void> => {
  res.redirect('/checkout?error=nagad_checkout_unavailable');
};

// 6. Payment Cancellation & Inventory Release
export const cancelPaymentSession = async (req: any, res: Response): Promise<void> => {
  try {
    const { orderNumber, email, phone } = req.body;
    if (!orderNumber) {
      res.status(400).json({ success: false, message: 'orderNumber is required to cancel payment.' });
      return;
    }

    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findOne({ orderNumber });
    } else {
      order = memoryStore.orders.find((o) => o.orderNumber === orderNumber);
    }

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    const user = req.user as { id: string; email: string; role?: string } | undefined;
    const authorized = user
      ? canAccessOrder(order, user)
      : matchesOrderContact(order, { email, phone });
    if (!authorized) {
      res.status(403).json({ success: false, message: 'Order ownership could not be verified.' });
      return;
    }

    if (order.paymentMethod !== 'bkash' || order.orderStatus !== 'Pending Payment') {
      res.status(409).json({ success: false, message: 'Only an unpaid bKash checkout can be cancelled here.' });
      return;
    }

    if (order.paymentStatus === 'Paid') {
      res.status(400).json({ success: false, message: 'Cannot cancel an order that has already been paid.' });
      return;
    }

    if (order.orderStatus === 'Cancelled') {
      res.status(409).json({ success: false, message: 'This order has already been cancelled.' });
      return;
    }

    if (isDbConnected() && order.paymentMethod === 'bkash') {
      const unresolvedAttempt = await PaymentTransactionModel.findOne({
        orderNumber: order.orderNumber,
        provider: 'bkash',
        status: { $in: ['initiated', 'pending'] },
      });
      if (unresolvedAttempt) {
        res.status(409).json({
          success: false,
          message: 'The provider payment attempt must be reconciled before the order can be cancelled or stock released.',
        });
        return;
      }
    }

    order.paymentStatus = 'Cancelled';
    order.orderStatus = 'Cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: isDbConnected() ? new Date() : new Date().toISOString(),
      note: 'Payment session cancelled by user. Reserved stock restored.',
    });

    await restoreOrderInventory(order);

    if (isDbConnected()) {
      await order.save();
    }

    res.json({ success: true, message: 'Payment session cancelled. Reserved stock released.', order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Admin Record Cash on Delivery (COD) Collection
export const recordCodCollection = async (req: any, res: Response): Promise<void> => {
  try {
    const { orderId, amountCollected, note } = req.body;

    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required.' });
      return;
    }

    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findById(orderId);
      if (!order) order = await OrderModel.findOne({ orderNumber: orderId });
    } else {
      order = memoryStore.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    }

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (order.paymentMethod !== 'cod') {
      res.status(400).json({ success: false, message: 'Cash collection can only be recorded for COD orders.' });
      return;
    }

    if (order.paymentStatus === 'Paid') {
      res.status(409).json({ success: false, message: 'COD collection has already been recorded.' });
      return;
    }

    if (order.orderStatus !== 'Delivered') {
      res.status(409).json({ success: false, message: 'COD collection can only be recorded after delivery.' });
      return;
    }

    const collectedAmount = amountCollected === undefined ? Number(order.total) : Number(amountCollected);
    if (
      !Number.isFinite(collectedAmount) ||
      Math.round(collectedAmount * 100) !== Math.round(Number(order.total) * 100)
    ) {
      res.status(400).json({ success: false, message: 'Collected amount must equal the order total.' });
      return;
    }

    if (isDbConnected()) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const currentOrder = await OrderModel.findById(order._id).session(session);
          if (
            !currentOrder ||
            currentOrder.paymentMethod !== 'cod' ||
            currentOrder.paymentStatus === 'Paid' ||
            currentOrder.orderStatus !== 'Delivered' ||
            Math.round(Number(currentOrder.total) * 100) !== Math.round(collectedAmount * 100)
          ) {
            throw new Error('Order changed before cash collection was recorded. Refresh and verify its delivery status.');
          }

          const collectionRef = `COD-${currentOrder.orderNumber}-${Date.now()}`;
          currentOrder.paymentStatus = 'Paid';
          currentOrder.statusHistory.push({
            status: currentOrder.orderStatus,
            timestamp: new Date(),
            note: `COD payment of ${collectedAmount.toFixed(2)} collected by ${req.user?.name || 'Admin'}. ${note || ''}`,
          });
          await currentOrder.save({ session });
          await PaymentTransactionModel.create(
            [{
              orderId: currentOrder._id.toString(),
              orderNumber: currentOrder.orderNumber,
              provider: 'cod',
              amount: collectedAmount,
              currency: 'USD',
              transactionId: collectionRef,
              paymentId: collectionRef,
              status: 'completed',
            }],
            { session }
          );
          order = currentOrder;
        });
      } finally {
        await session.endSession();
      }
    } else {
      order.paymentStatus = 'Paid';
      order.statusHistory.push({
        status: order.orderStatus,
        timestamp: new Date().toISOString(),
        note: `COD payment of ${collectedAmount.toFixed(2)} collected by ${req.user?.name || 'Admin'}. ${note || ''}`,
      });
      const collectionRef = `COD-${order.orderNumber}-${Date.now()}`;
      memoryStore.paymentTransactions.unshift({
        id: collectionRef,
        orderId: order.id,
        orderNumber: order.orderNumber,
        provider: 'cod',
        amount: collectedAmount,
        currency: 'USD',
        transactionId: collectionRef,
        paymentId: collectionRef,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    }

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'COD Payment Collected',
      order.orderNumber,
      `Marked COD paid: ${collectedAmount.toFixed(2)}`
    );

    res.json({ success: true, message: 'Cash collection recorded.', order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Admin Payment Refund
export const refundPayment = async (req: any, res: Response): Promise<void> => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required.' });
      return;
    }

    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findById(orderId) || await OrderModel.findOne({ orderNumber: orderId });
    } else {
      order = memoryStore.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    }

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found.' });
      return;
    }

    if (order.paymentStatus !== 'Paid') {
      res.status(400).json({ success: false, message: 'Only paid orders can be refunded.' });
      return;
    }

    const refundAmount = amount === undefined ? Number(order.total) : Number(amount);
    if (!Number.isFinite(refundAmount) || Math.round(refundAmount * 100) !== Math.round(Number(order.total) * 100)) {
      res.status(400).json({ success: false, message: 'Only a full-order refund is supported.' });
      return;
    }

    if (order.paymentMethod !== 'bkash' || !isDbConnected() || !bkashService.isConfigured()) {
      res.status(503).json({ success: false, message: 'A verified provider refund is unavailable for this payment method.' });
      return;
    }

    const txn = await PaymentTransactionModel.findOne({
      orderNumber: order.orderNumber,
      provider: 'bkash',
      status: 'completed',
    });
    if (!txn?.paymentId || !txn.transactionId) {
      res.status(409).json({ success: false, message: 'No completed bKash transaction is available to refund.' });
      return;
    }

    const unresolvedRefund = await PaymentTransactionModel.findOne({
      orderNumber: order.orderNumber,
      provider: 'bkash',
      paymentId: { $regex: '^REFUND-' },
      status: { $in: ['initiated', 'pending'] },
    });
    if (unresolvedRefund) {
      res.status(409).json({
        success: false,
        message: 'A previous refund attempt is unresolved. Reconcile it with bKash before retrying.',
      });
      return;
    }

    const refundAttempt = await PaymentTransactionModel.create({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      provider: 'bkash',
      amount: usdToBdtAmount(refundAmount),
      currency: 'BDT',
      paymentId: `REFUND-${order.orderNumber}-${Date.now()}`,
      status: 'initiated',
    });

    const bkashRefund = await bkashService.refundPayment({
      paymentID: txn.paymentId,
      trxID: txn.transactionId,
      amount: usdToBdtAmount(refundAmount),
      reason: reason || 'Customer refund requested',
      sandbox: Boolean(memoryStore.paymentSettings.bkashSandbox),
    });

    if (!bkashRefund.success || !bkashRefund.refundTrxID) {
      await PaymentTransactionModel.findByIdAndUpdate(refundAttempt._id, { status: 'pending' });
      res.status(502).json({
        success: false,
        message: bkashRefund.message || 'bKash refund status is uncertain. Reconcile before retrying.',
      });
      return;
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const currentOrder = await OrderModel.findById(order._id).session(session);
        const currentRefund = await PaymentTransactionModel.findById(refundAttempt._id).session(session);
        if (!currentOrder || currentOrder.paymentStatus !== 'Paid' || !currentRefund) {
          throw new Error('Provider refund succeeded but local state changed; manual reconciliation is required.');
        }

        currentOrder.paymentStatus = 'Refunded';
        currentOrder.orderStatus = 'Refunded';
        currentOrder.statusHistory.push({
          status: 'Refunded',
          timestamp: new Date(),
          note: `Full refund of $${refundAmount.toFixed(2)} processed by ${req.user?.name || 'Admin'}. Reason: ${reason || 'N/A'}`,
        });
        currentRefund.transactionId = bkashRefund.refundTrxID;
        currentRefund.status = 'completed';
        await currentOrder.save({ session });
        await currentRefund.save({ session });
        order = currentOrder;
      });
    } finally {
      await session.endSession();
    }

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Payment Refunded',
      order.orderNumber,
      `Refunded $${refundAmount.toFixed(2)}. Reason: ${reason || 'Customer return'}`
    );

    res.json({ success: true, message: `Refund of $${refundAmount.toFixed(2)} recorded successfully.`, order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Admin Transactions Audit Log
export const getAdminTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (isDbConnected()) {
      const txns = await PaymentTransactionModel.find().sort({ createdAt: -1 });
      res.json({ success: true, data: txns });
      return;
    }
    res.json({ success: true, data: memoryStore.paymentTransactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
