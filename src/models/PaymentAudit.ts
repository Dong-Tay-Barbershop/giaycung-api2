import { Schema, model } from "mongoose";

const paymentAuditSchema = new Schema(
  {
    at: { type: Date, default: Date.now, index: true },
    code: { type: String, required: true, index: true },
    orderId: { type: String, default: "", index: true },
    paymentOrderId: { type: String, default: "" },
    transactionId: { type: String, default: "", index: true },
    referenceNumber: { type: String, default: "" },
    actor: { type: String, default: "vietqr-callback" },
    reason: { type: String, default: "" },
    payloadHash: { type: String, default: "" },
    snapshot: { type: Schema.Types.Mixed },
  },
  { versionKey: false }
);

export default model("PaymentAudit", paymentAuditSchema);
