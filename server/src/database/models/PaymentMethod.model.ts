import mongoose, { Document, Schema } from 'mongoose';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover' | 'card';

export interface IPaymentMethod extends Document {
  workspaceId: mongoose.Types.ObjectId;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    brand: {
      type: String,
      enum: ['visa', 'mastercard', 'amex', 'discover', 'card'],
      required: true,
    },
    last4: { type: String, required: true, minlength: 4, maxlength: 4 },
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true },
    holderName: { type: String, required: true, trim: true, maxlength: 80 },
    isDefault: { type: Boolean, default: true },
  },
  { timestamps: true },
);

paymentMethodSchema.index({ workspaceId: 1, createdAt: -1 });

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
