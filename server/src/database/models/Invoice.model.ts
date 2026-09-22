import mongoose, { Document, Schema } from 'mongoose';
import type { PlanKey } from './Plan.model';

export type InvoiceStatus = 'issued' | 'paid' | 'void';

export interface IInvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface IInvoice extends Document {
  workspaceId: mongoose.Types.ObjectId;
  number: string;
  status: InvoiceStatus;
  planKey: PlanKey;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  periodStart: Date;
  periodEnd: Date;
  lineItems: IInvoiceLineItem[];
  issuedAt: Date;
  paidAt: Date | null;
  dueAt: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<IInvoiceLineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitAmount: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoice>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    number: { type: String, required: true, unique: true },
    status: { type: String, enum: ['issued', 'paid', 'void'], default: 'issued', index: true },
    planKey: { type: String, enum: ['free', 'pro', 'enterprise'], required: true },
    currency: { type: String, default: 'USD' },
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    lineItems: { type: [lineItemSchema], default: [] },
    issuedAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    dueAt: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

invoiceSchema.index({ workspaceId: 1, periodStart: 1 }, { unique: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
