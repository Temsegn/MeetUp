import mongoose, { Document, Schema } from 'mongoose';

/**
 * Persisted Excalidraw scene for a meeting room.
 * One document per meeting `roomId` (whiteboardId === roomId).
 */
export interface IWhiteboardDocument extends Document {
  roomId: string;
  revision: number;
  /** Serialized Excalidraw elements (including soft-deleted). */
  elements: unknown[];
  /** BinaryFiles map (fileId → { mimeType, id, dataURL, created, lastRetrieved }). */
  files: Record<string, unknown>;
  updatedAt: Date;
  createdAt: Date;
}

const whiteboardDocumentSchema = new Schema<IWhiteboardDocument>(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    revision: { type: Number, required: true, default: 0, min: 0 },
    elements: { type: [Schema.Types.Mixed], default: [] },
    files: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const WhiteboardDocument = mongoose.model<IWhiteboardDocument>(
  'WhiteboardDocument',
  whiteboardDocumentSchema,
);
