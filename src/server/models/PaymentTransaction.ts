import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentTransaction extends Document {
  orderId: string;
  orderNumber: string;
  provider: 'bkash' | 'nagad' | 'cod' | 'card';
  amount: number;
  currency: string;
  transactionId?: string;
  paymentId?: string;
  checkoutUrl?: string;
  status: 'initiated' | 'pending' | 'completed' | 'failed' | 'cancelled';
  customerPhone?: string;
  rawResponse?: any;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    provider: {
      type: String,
      enum: ['bkash', 'nagad', 'cod', 'card'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'BDT' },
    transactionId: { type: String },
    paymentId: { type: String, sparse: true, index: true },
    checkoutUrl: { type: String },
    status: {
      type: String,
      enum: ['initiated', 'pending', 'completed', 'failed', 'cancelled'],
      default: 'initiated',
      index: true,
    },
    customerPhone: { type: String },
    rawResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index(
  { provider: 1, transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $type: 'string' } } }
);

export const PaymentTransaction =
  mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);
