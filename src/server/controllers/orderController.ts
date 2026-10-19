import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order as OrderModel, OrderStatus as MongoOrderStatus } from '../models/Order';
import { Product as ProductModel } from '../models/Product';
import { PaymentTransaction as PaymentTransactionModel } from '../models/PaymentTransaction';
import { AuditLog as AuditLogModel } from '../models/AuditLog';
import { isDbConnected } from '../config/db';
import { memoryStore } from '../config/memoryStore';
import { buildIdentifierQuery } from '../utils/resolveIdentifier';
import { Order, OrderStatus, PaymentMethod } from '../../types';
import { bkashService } from '../services/bkashService';
import { canAccessOrder, matchesOrderContact } from '../utils/orderAccess';

class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

export const createOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const { shippingAddress, items, couponCode, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Cart is empty. Cannot create order.' });
      return;
    }

    const selectedPaymentMethod = paymentMethod === 'Cash on Delivery' ? 'cod' : paymentMethod;
    if (selectedPaymentMethod !== 'cod' && selectedPaymentMethod !== 'bkash') {
      res.status(503).json({ success: false, message: 'This payment method is not available for verified checkout.' });
      return;
    }

    if (selectedPaymentMethod === 'cod' && !memoryStore.paymentSettings.codEnabled) {
      res.status(503).json({ success: false, message: 'Cash on Delivery is currently unavailable.' });
      return;
    }

    if (
      selectedPaymentMethod === 'bkash' &&
      (!isDbConnected() || !memoryStore.paymentSettings.bkashEnabled || !bkashService.isConfigured())
    ) {
      res.status(503).json({
        success: false,
        message: 'bKash checkout is unavailable until persistent storage and merchant credentials are configured.',
      });
      return;
    }

    if (
      items.some(
        (item: any) =>
          !item ||
          typeof item.productId !== 'string' ||
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1
      )
    ) {
      res.status(400).json({ success: false, message: 'Each order item must have a product and a positive integer quantity.' });
      return;
    }

    const street = shippingAddress?.streetAddress || shippingAddress?.street;
    if (
      !shippingAddress ||
      typeof shippingAddress.fullName !== 'string' ||
      !shippingAddress.fullName.trim() ||
      typeof shippingAddress.phone !== 'string' ||
      !shippingAddress.phone.trim() ||
      typeof shippingAddress.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email.trim()) ||
      typeof street !== 'string' ||
      !street.trim()
    ) {
      res.status(400).json({
        success: false,
        message: 'A valid contact email, name, phone, and street address are required.',
      });
      return;
    }

    if (isDbConnected()) {
      const session = await mongoose.startSession();
      let createdOrder: any = null;
      try {
        await session.withTransaction(async () => {
          let computedSubtotal = 0;
          const validatedItems = [];

          for (const item of items) {
            const dbProduct = await ProductModel.findOne(
              buildIdentifierQuery(item.productId, ['slug', 'sku'])
            ).session(session);
            if (!dbProduct) {
              throw new CheckoutValidationError(`Product ${item.productId} is no longer available.`);
            }

            let price = dbProduct.price;
            if (item.variantId) {
              const variant = dbProduct.variants?.find((v: any) => v.id === item.variantId);
              if (!variant) {
                throw new CheckoutValidationError(`Selected variant is unavailable for ${dbProduct.name}.`);
              }
              if (variant.inventory < item.quantity) {
                throw new CheckoutValidationError(
                  `Insufficient stock for ${dbProduct.name} (${variant.name}). Only ${variant.inventory} available.`
                );
              }
              price = variant.price;
              variant.inventory -= item.quantity;
            }

            if (dbProduct.inventory < item.quantity) {
              throw new CheckoutValidationError(`Insufficient stock for ${dbProduct.name}.`);
            }

            dbProduct.inventory -= item.quantity;
            await dbProduct.save({ session });

            computedSubtotal += price * item.quantity;
            validatedItems.push({
              productId: dbProduct._id.toString(),
              variantId: item.variantId,
              name: dbProduct.name,
              sku: item.sku || dbProduct.sku,
              price,
              quantity: item.quantity,
              image: dbProduct.mainImage,
              selectedAttributes: item.selectedAttributes,
            });
          }

          const shippingFee = computedSubtotal >= 49 ? 0 : 4.99;
          let discount = 0;
          if (couponCode === 'SUMMER60' || couponCode === 'MARKETLY20') {
            discount = computedSubtotal * 0.2;
          } else if (couponCode === 'SAVE10') {
            discount = 10;
          }
          const computedTotal = Math.max(0, computedSubtotal + shippingFee - discount);
          const orderNumber = `MKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

          const [newOrder] = await OrderModel.create(
            [{
              orderNumber,
              customer: {
                userId: req.user?.id,
                name: shippingAddress.fullName,
                email: req.user?.email || shippingAddress.email,
                phone: shippingAddress.phone,
              },
              shippingAddress,
              items: validatedItems,
              subtotal: computedSubtotal,
              discount,
              shippingFee,
              total: computedTotal,
              couponCode,
              paymentMethod: selectedPaymentMethod,
              paymentStatus: 'Pending',
              orderStatus: selectedPaymentMethod === 'cod' ? 'Confirmed' : 'Pending Payment',
              statusHistory: [
                {
                  status: selectedPaymentMethod === 'cod' ? 'Confirmed' : 'Pending Payment',
                  timestamp: new Date(),
                  note:
                    selectedPaymentMethod === 'cod'
                      ? 'Order confirmed. Cash on Delivery verification pending courier delivery.'
                      : `Order registered. Awaiting verified payment transaction via ${String(paymentMethod).toUpperCase()}.`,
                },
              ],
            }],
            { session }
          );
          await AuditLogModel.create(
            [{
              actor: shippingAddress.fullName,
              action: 'Order Placed',
              resource: orderNumber,
              details: `Total: $${computedTotal.toFixed(2)}, Items: ${validatedItems.length}, Method: ${paymentMethod}`,
            }],
            { session }
          );
          createdOrder = newOrder;
        });
      } catch (error) {
        if (error instanceof CheckoutValidationError) {
          res.status(400).json({ success: false, message: error.message });
          return;
        }
        throw error;
      } finally {
        await session.endSession();
      }

      res.status(201).json({ success: true, data: createdOrder });
      return;
    }

    // In-memory checkout processing
    let computedSubtotal = 0;
    const validatedItems = [];
    const inventoryChanges = new Map<
      string,
      { product: (typeof memoryStore.products)[number]; inventory: number; variants: Map<string, number> }
    >();

    for (const item of items) {
      const prod = memoryStore.products.find((p) => p.id === item.productId || p.slug === item.productId);
      if (!prod) {
        res.status(400).json({ success: false, message: `Product ${item.productId} is no longer available.` });
        return;
      }

      let inventory = inventoryChanges.get(prod.id);
      if (!inventory) {
        inventory = {
          product: prod,
          inventory: prod.inventory,
          variants: new Map((prod.variants || []).map((variant) => [variant.id, variant.inventory])),
        };
        inventoryChanges.set(prod.id, inventory);
      }

      if (inventory.inventory < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for ${prod.name}. Only ${inventory.inventory} available.`,
        });
        return;
      }
      const variant = item.variantId ? prod.variants?.find((v) => v.id === item.variantId) : undefined;
      if (item.variantId && !variant) {
        res.status(400).json({ success: false, message: `Selected variant is unavailable for ${prod.name}.` });
        return;
      }
      const variantInventory = variant ? inventory.variants.get(variant.id) ?? 0 : 0;
      if (variant && variantInventory < item.quantity) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock for ${prod.name} (${variant.name}). Only ${variantInventory} available.`,
        });
        return;
      }

      const price = variant?.price ?? prod.price;
      inventory.inventory -= item.quantity;
      if (variant) inventory.variants.set(variant.id, variantInventory - item.quantity);

      computedSubtotal += price * item.quantity;
      validatedItems.push({
        productId: prod.id,
        variantId: item.variantId,
        name: prod.name,
        sku: item.sku || prod.sku,
        price,
        quantity: item.quantity,
        image: variant?.image || prod.mainImage,
        selectedAttributes: item.selectedAttributes,
      });
    }

    for (const { product, inventory, variants } of inventoryChanges.values()) {
      product.inventory = inventory;
      product.variants?.forEach((variant) => {
        const updatedInventory = variants.get(variant.id);
        if (updatedInventory !== undefined) variant.inventory = updatedInventory;
      });
    }

    const shippingFee = computedSubtotal >= 49 ? 0 : 4.99;
    let discount = 0;
    if (couponCode === 'SUMMER60' || couponCode === 'MARKETLY20') {
      discount = computedSubtotal * 0.2;
    } else if (couponCode === 'SAVE10') {
      discount = 10;
    }
    const computedTotal = Math.max(0, computedSubtotal + shippingFee - discount);
    const orderNumber = `MKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: 'ord_' + Date.now(),
      orderNumber,
      customer: {
        userId: req.user?.id,
        name: shippingAddress.fullName,
        email: req.user?.email || shippingAddress.email,
        phone: shippingAddress.phone,
      },
      shippingAddress,
      items: validatedItems,
      subtotal: computedSubtotal,
      discount,
      shippingFee,
      total: computedTotal,
      couponCode,
      paymentMethod: selectedPaymentMethod as PaymentMethod,
      paymentStatus: 'Pending',
      orderStatus: selectedPaymentMethod === 'cod' ? 'Confirmed' : 'Pending Payment',
      statusHistory: [
        {
          status: selectedPaymentMethod === 'cod' ? 'Confirmed' : 'Pending Payment',
          timestamp: new Date().toISOString(),
          note:
            selectedPaymentMethod === 'cod'
              ? 'Order placed. Cash on Delivery verification pending courier delivery.'
              : `Order registered. Awaiting verified payment transaction via ${String(paymentMethod).toUpperCase()}.`,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    memoryStore.orders.unshift(newOrder);
    memoryStore.logAudit(
      shippingAddress.fullName,
      'Order Placed',
      orderNumber,
      `Total: $${computedTotal.toFixed(2)}, Items: ${validatedItems.length}, Method: ${paymentMethod}`
    );

    res.status(201).json({ success: true, data: newOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrders = async (req: any, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required to view orders.' });
      return;
    }

    const isAdminUser = user.role === 'admin' || user.role === 'super_admin';

    if (isDbConnected()) {
      const email = user.email.toLowerCase();
      const query = isAdminUser
        ? {}
        : {
            $or: [
              { 'customer.userId': user.id },
              {
                $and: [
                  { 'customer.userId': { $in: [null, ''] } },
                  {
                    $or: [
                      { 'customer.email': email },
                      { 'shippingAddress.email': email },
                    ],
                  },
                ],
              },
            ],
          };
      const orders = await OrderModel.find(query).sort({ createdAt: -1 });
      res.json({ success: true, data: orders });
      return;
    }

    let orders = memoryStore.orders;
    if (!isAdminUser) {
      orders = orders.filter((order) => {
        if (order.customer?.userId) return order.customer.userId === user.id;
        return (
          order.customer?.email?.toLowerCase() === user.email.toLowerCase() ||
          order.shippingAddress?.email?.toLowerCase() === user.email.toLowerCase()
        );
      });
    }
    res.json({ success: true, data: orders });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderByNumber = async (req: any, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const target = typeof req.body?.orderNumber === 'string' ? req.body.orderNumber.trim() : '';
    const authenticatedUser = req.user as { id: string; email: string; role?: string } | undefined;
    if (!target || (!authenticatedUser && (!req.body?.email || !req.body?.phone))) {
      res.status(400).json({
        success: false,
        message: 'Order number, email, and phone are required to verify an order.',
      });
      return;
    }

    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findOne({
        $or: [
          { orderNumber: target },
          { _id: target.match(/^[0-9a-fA-F]{24}$/) ? target : null },
        ],
      });
    } else {
      order = memoryStore.orders.find(
        (candidate) =>
          candidate.orderNumber.toUpperCase() === target.toUpperCase() || candidate.id === target
      );
    }

    const authorized = order && (
      authenticatedUser
        ? canAccessOrder(order, authenticatedUser)
        : matchesOrderContact(order, req.body)
    );
    if (!authorized) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreOrderInventory = async (order: any): Promise<void> => {
  if (!order || !Array.isArray(order.items) || order.inventoryRestored) return;

  if (isDbConnected()) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const persistedOrder = await OrderModel.findById(order._id).session(session);
        if (!persistedOrder) {
          throw new Error(`Order ${order.orderNumber} was not found while restoring inventory.`);
        }

        if (persistedOrder.inventoryRestored) {
          persistedOrder.paymentStatus = order.paymentStatus;
          persistedOrder.orderStatus = order.orderStatus;
          persistedOrder.statusHistory = order.statusHistory;
          await persistedOrder.save({ session });
          return;
        }

        for (const item of persistedOrder.items) {
          const quantity = Number(item.quantity || 1);
          const productId = item.productId;
          if (!productId || !Number.isInteger(quantity) || quantity < 1) {
            throw new Error(`Invalid inventory item on order ${order.orderNumber}.`);
          }

          const dbProduct = await ProductModel.findOne(
            buildIdentifierQuery(productId, ['slug', 'sku'])
          ).session(session);
          if (!dbProduct) {
            throw new Error(`Product ${productId} was not found while restoring order inventory.`);
          }

          dbProduct.inventory += quantity;
          if (item.variantId) {
            const variant = dbProduct.variants?.find((entry: any) => entry.id === item.variantId);
            if (!variant) {
              throw new Error(`Variant ${item.variantId} was not found while restoring order inventory.`);
            }
            variant.inventory += quantity;
          }
          await dbProduct.save({ session });
        }

        persistedOrder.orderStatus = order.orderStatus;
        persistedOrder.paymentStatus = order.paymentStatus;
        persistedOrder.statusHistory = order.statusHistory;
        persistedOrder.inventoryRestored = true;
        await persistedOrder.save({ session });
      });
      order.inventoryRestored = true;
    } finally {
      await session.endSession();
    }
    return;
  }

  const updates: Array<{ product: (typeof memoryStore.products)[number]; quantity: number }> = [];
  for (const item of order.items) {
    const quantity = Number(item.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid inventory item on order ${order.orderNumber}.`);
    }
    const product = memoryStore.products.find((entry) => entry.id === item.productId || entry.slug === item.productId);
    if (!product) {
      throw new Error(`Product ${item.productId} was not found while restoring order inventory.`);
    }
    updates.push({ product, quantity });
  }

  for (const { product, quantity } of updates) {
    product.inventory += quantity;
  }
  order.inventoryRestored = true;
};

export const updateOrderStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const VALID_ORDER_STATUSES = [
      'Pending Payment',
      'Confirmed',
      'Processing',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Refunded',
    ];

    if (!status || !VALID_ORDER_STATUSES.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed values: ${VALID_ORDER_STATUSES.join(', ')}`,
      });
      return;
    }
    if (status === 'Refunded') {
      res.status(400).json({ success: false, message: 'Use the payment refund operation to record a refund.' });
      return;
    }

    if (isDbConnected()) {
      const order = await OrderModel.findOne(buildIdentifierQuery(id, ['orderNumber']));
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      if (
        order.paymentMethod !== 'cod' &&
        order.paymentStatus !== 'Paid' &&
        status !== 'Pending Payment' &&
        status !== 'Cancelled'
      ) {
        res.status(409).json({
          success: false,
          message: 'An online order cannot enter fulfillment until its provider payment is verified.',
        });
        return;
      }

      if (status === 'Cancelled' && order.paymentStatus === 'Paid') {
        res.status(409).json({ success: false, message: 'Paid orders must be refunded before cancellation.' });
        return;
      }

      if (status === 'Cancelled' && order.paymentMethod === 'bkash') {
        const unresolvedAttempt = await PaymentTransactionModel.findOne({
          orderNumber: order.orderNumber,
          provider: 'bkash',
          status: { $in: ['initiated', 'pending'] },
        });
        if (unresolvedAttempt) {
          res.status(409).json({
            success: false,
            message: 'The provider payment attempt must be reconciled before cancellation or stock release.',
          });
          return;
        }
      }

      order.orderStatus = status as MongoOrderStatus;
      order.statusHistory.push({
        status: status as MongoOrderStatus,
        timestamp: new Date(),
        note: note || `Status transitioned to ${status}`,
      });

      // If order is cancelled, restore reserved stock safely
      if (status === 'Cancelled') {
        await restoreOrderInventory(order);
      }

      await order.save();

      await AuditLogModel.create({
        actor: req.user?.name || 'Admin',
        action: 'Order Status Changed',
        resource: order.orderNumber,
        details: `Transitioned to ${status}. Note: ${note || 'None'}`,
      });

      res.json({ success: true, data: order });
      return;
    }

    const order = memoryStore.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (
      order.paymentMethod !== 'cod' &&
      order.paymentStatus !== 'Paid' &&
      status !== 'Pending Payment' &&
      status !== 'Cancelled'
    ) {
      res.status(409).json({
        success: false,
        message: 'An online order cannot enter fulfillment until its provider payment is verified.',
      });
      return;
    }

    if (status === 'Cancelled' && order.paymentStatus === 'Paid') {
      res.status(409).json({ success: false, message: 'Paid orders must be refunded before cancellation.' });
      return;
    }

    order.orderStatus = status as OrderStatus;    order.statusHistory.push({
      status: status as OrderStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status transitioned to ${status}`,
    });

    if (status === 'Cancelled') {
      await restoreOrderInventory(order);
    }

    memoryStore.logAudit(
      req.user?.name || 'Admin',
      'Order Status Changed',
      order.orderNumber,
      `Transitioned to ${status}. Note: ${note || 'None'}`
    );

    res.json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelOrder = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    let order: any = null;
    if (isDbConnected()) {
      order = await OrderModel.findById(id) || await OrderModel.findOne({ orderNumber: id });
    } else {
      order = memoryStore.orders.find((o) => o.id === id || o.orderNumber === id);
    }

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const authorized = user
      ? canAccessOrder(order, user)
      : matchesOrderContact(order, req.body || {});
    if (!authorized) {
      res.status(403).json({ success: false, message: 'Order ownership could not be verified.' });
      return;
    }

    if (order.orderStatus === 'Shipped' || order.orderStatus === 'Delivered') {
      res.status(400).json({ success: false, message: 'Cannot cancel an order that has already been dispatched or delivered.' });
      return;
    }

    if (order.paymentStatus === 'Paid') {
      res.status(409).json({ success: false, message: 'Paid orders must be refunded before cancellation.' });
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
          message: 'The provider payment attempt must be reconciled before cancellation or stock release.',
        });
        return;
      }
    }

    order.orderStatus = 'Cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: isDbConnected() ? new Date() : new Date().toISOString(),
      note: `Order cancelled by ${user?.name || 'Customer'}. Inventory restored.`,
    });

    await restoreOrderInventory(order);

    if (isDbConnected()) {
      await order.save();
    }

    res.json({ success: true, message: 'Order cancelled successfully and stock restored.', data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
