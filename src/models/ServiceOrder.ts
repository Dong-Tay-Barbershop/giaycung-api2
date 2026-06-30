import { Schema, model } from "mongoose";

const shoeSchema = new Schema(
  {
    id:      { type: String, required: true, default: () => `shoe_${Date.now()}` },
    name:    { type: String, required: true },
    service: { type: String, required: true },
    status: {
      type: String,
      enum: ["received", "processing", "completed"],
      default: "received",
    },
    images:  { type: [String], default: [] },
    notes:   { type: String, default: "" },
    deleted: { type: Boolean, default: false },
  },
  { _id: false, versionKey: false }
);

const serviceOrderSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `ord_${Date.now()}`,
    },
    orderNumber:   { type: String, required: true, unique: true },  // ORD-001
    customerName:  { type: String, required: true },
    customerPhone: { type: String, required: true },
    createdDate:   { type: String, default: () => new Date().toISOString().slice(0, 10) },  // YYYY-MM-DD
    totalAmount:   { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "cancelled"],
      default: "pending",
    },
    assignedTo: { type: String, default: "" },
    shoes:      { type: [shoeSchema], default: [] },

    // ===== Payment =====
    // paymentMethod KHÔNG chọn khi tạo đơn — chỉ được set bởi hành động thanh
    // toán thực tế: tạo QR ⇒ "vietqr"; admin xác nhận tiền mặt ⇒ "cash".
    paymentMethod: {
      type: String,
      enum: ["cash", "vietqr"],
      default: null,
    },
    // paymentStatus độc lập với status đơn. unpaid → pending (đã tạo QR /
    // đang chờ chuyển khoản) → paid; hoặc refunded/failed.
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid", "failed", "refunded"],
      default: "unpaid",
    },
    paymentNote: { type: String, default: "" },
    paymentOrderId:         { type: String, unique: true, sparse: true },
    paymentContent:         { type: String, default: "" },
    paymentQrCode:          { type: String, default: "" },
    paymentQrLink:          { type: String, default: "" },
    paymentProviderRef:     { type: String, default: "" },
    paymentBankAccount:     { type: String, default: "" },
    paymentBankCode:        { type: String, default: "" },
    paymentBankAccountName: { type: String, default: "" },
    paymentTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    paymentReferenceNumber: { type: String, default: "", select: false },
    paidAmount:             { type: Number, default: 0 },
    paidAt:                 { type: Date },
    paymentRaw:             { type: Schema.Types.Mixed, select: false },
  },
  { versionKey: false, timestamps: false }
);

export default model("ServiceOrder", serviceOrderSchema);
