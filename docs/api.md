# API Reference — giaycung-api

Base URL: `https://<your-vercel-domain>/api`

Tất cả response đều có format:
```json
{ "ok": true | false, "data": ..., "message": "..." }
```

Auth admin: thêm header `Authorization: Bearer <token>` (JWT lấy từ `/api/login`).

---

## Mục lục

- [Ping](#ping)
- [Login](#login)
- [Pagination](#pagination)
- [Products](#products)
- [Services](#services)
- [News](#news)
- [Messages](#messages)
- [Contact](#contact)
- [Orders](#orders)
- [Service Orders](#service-orders)

---

## Ping

### `GET /api/ping`
Kiểm tra API hoạt động.

**Response**
```json
{ "ok": true, "message": "pong" }
```

---

## Login

### `POST /api/login`
Đăng nhập admin, trả về JWT token.

**Body**
```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

**Response 200**
```json
{
  "ok": true,
  "token": "<jwt>",
  "user": { "email": "admin@example.com", "role": "admin" }
}
```

**Response 401**
```json
{ "ok": false, "message": "Sai email hoặc mật khẩu" }
```

Token hết hạn sau **24 giờ**. Dùng token này ở mọi request admin-only.

---

## Pagination

Tất cả các endpoint trả danh sách đều hỗ trợ phân trang:

**Query params**
| Param | Default | Mô tả |
|---|---|---|
| `page` | `1` | Trang hiện tại |
| `limit` | `20` | Số item mỗi trang (tối đa 100) |

**Response format**
```json
{
  "ok": true,
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Products

### `GET /api/products`
Lấy danh sách sản phẩm. Public.

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `status` | Lọc theo status: `published` \| `draft` |
| `page`, `limit` | Phân trang |

**Response 200** — xem [Pagination](#pagination)

---

### `POST /api/products`
Thêm sản phẩm mới. **Admin only.**

**Body**
```json
{
  "name": "Tên sản phẩm",
  "description": "Mô tả",
  "price": 150000,
  "imageUrl": "https://...",
  "category": "sneaker",
  "stock": 10,
  "rating": 4.5,
  "status": "published"
}
```

Fields bắt buộc: `name`, `description`, `imageUrl`, `category`.  
`id` tự sinh: `prd_<timestamp>`.

**Response 200**
```json
{ "ok": true, "data": { "id": "prd_1234567890" } }
```

---

### `PATCH /api/products?id=<id>`
Cập nhật sản phẩm. **Admin only.**

**Body** (chỉ truyền field cần cập nhật)
```json
{
  "price": 200000,
  "stock": 5,
  "status": "draft"
}
```

Updatable fields: `name`, `description`, `price`, `imageUrl`, `category`, `stock`, `rating`, `status`.

**Response 200**
```json
{ "ok": true, "data": { "id": "prd_1234567890" } }
```

---

### `DELETE /api/products?id=<id>`
Xóa sản phẩm (hard delete). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "prd_1234567890" } }
```

---

## Services

### `GET /api/services`
Lấy danh sách dịch vụ. Public.

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `status` | `published` (default) \| `draft` |
| `all` | Truyền bất kỳ giá trị để lấy tất cả (bỏ qua filter status) |
| `page`, `limit` | Phân trang |

**Response 200** — xem [Pagination](#pagination)

---

### `POST /api/services`
Thêm dịch vụ. **Admin only.**

**Body**
```json
{
  "title": "Giặt chuyên sâu",
  "description": "...",
  "price": "100.000đ",
  "duration": "3-5 ngày",
  "imageUrl": "https://...",
  "features": "...",
  "status": "published"
}
```

Field bắt buộc: `title`. `id` tự sinh: `srv_<timestamp>`.  
`price` là **String** (linh hoạt: `"150.000đ"`, `"Liên hệ"`, ...).

**Response 200**
```json
{ "ok": true, "data": { "id": "srv_1234567890" } }
```

---

### `PATCH /api/services?id=<id>`
Cập nhật dịch vụ. **Admin only.**

Updatable fields: `title`, `description`, `price`, `duration`, `imageUrl`, `features`, `status`.

**Response 200**
```json
{ "ok": true, "data": { "id": "srv_1234567890" } }
```

---

### `DELETE /api/services?id=<id>`
Xóa dịch vụ (hard delete). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "srv_1234567890" } }
```

---

## News

### `GET /api/news`
Lấy danh sách bài viết. Public.

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `id=<id>` | Lấy 1 bài viết theo id (trả `{ ok, data: {...} }`, bỏ qua pagination) |
| `category=<category>` | Lọc theo danh mục |
| `status=<status>` | Lọc theo status: `published` \| `draft` |
| `q=<keyword>` | Tìm kiếm trong `title`, `excerpt`, `content` |
| `page`, `limit` | Phân trang |

Kết quả sắp xếp giảm dần theo `publishedDate`.

**Response 200 — danh sách** — xem [Pagination](#pagination)

**Response 200 — 1 bài viết (khi có `?id=`)**
```json
{ "ok": true, "data": { "id": "news_...", "title": "...", ... } }
```

---

### `POST /api/news`
Tạo bài viết mới. **Admin only.**

**Body**
```json
{
  "title": "Tiêu đề",
  "excerpt": "Tóm tắt",
  "content": "Nội dung",
  "imageUrl": "https://...",
  "category": "news",
  "author": "Admin",
  "publishedDate": "2024-01-15",
  "status": "published"
}
```

Fields bắt buộc: `title`, `excerpt`, `content`, `imageUrl`.  
`publishedDate` format YYYY-MM-DD.

**Response 200**
```json
{ "ok": true, "data": { "id": "news_1234567890" } }
```

---

### `PATCH /api/news?id=<id>`
Cập nhật bài viết. **Admin only.**

Updatable fields: `title`, `excerpt`, `content`, `imageUrl`, `category`, `author`, `publishedDate`, `status`.

**Response 200**
```json
{ "ok": true, "data": { "id": "news_1234567890" } }
```

---

### `DELETE /api/news?id=<id>`
Xóa bài viết (hard delete). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "news_1234567890" } }
```

---

## Messages

### `GET /api/messages`
Lấy danh sách tin nhắn. **Admin only.**

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `status` | Lọc theo status: `new` \| `read` \| ... |
| `page`, `limit` | Phân trang |

Kết quả sắp xếp giảm dần theo `createdAt`.

**Response 200** — xem [Pagination](#pagination)

---

### `POST /api/messages`
Gửi tin nhắn từ form liên hệ. **Public.**

**Body**
```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "a@example.com",
  "message": "Tôi muốn hỏi về dịch vụ...",
  "source": "contact-page"
}
```

Fields bắt buộc: `fullName`, `phone`, `message`.  
`source` mặc định: `"contact-page"`. `status` mặc định: `"new"`.

**Response 200**
```json
{ "ok": true, "data": { "id": "msg_1234567890" } }
```

---

### `PATCH /api/messages?id=<id>`
Cập nhật status tin nhắn. **Admin only.**

**Body**
```json
{ "status": "read" }
```

**Response 200**
```json
{ "ok": true, "data": { "id": "msg_1234567890" } }
```

---

### `DELETE /api/messages?id=<id>`
Xóa tin nhắn (hard delete). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "msg_1234567890" } }
```

---

## Contact

### `GET /api/contact`
Lấy danh sách thông tin cửa hàng. Public.

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `page`, `limit` | Phân trang |

**Response 200** — xem [Pagination](#pagination)

---

### `POST /api/contact`
Thêm cửa hàng. **Admin only.**

**Body**
```json
{
  "name": "Giày Cứng - Chi nhánh 2",
  "address": "456 Đường XYZ, Q.3, TP.HCM",
  "phone": "0907654321",
  "email": "cn2@giaycung.vn",
  "hours": "8:00 - 21:00",
  "googleMapsUrl": "https://maps.google.com/..."
}
```

Fields bắt buộc: `name`, `address`, `phone`, `email`.

**Response 200**
```json
{ "ok": true, "data": { "id": "store_1234567890" } }
```

---

### `PATCH /api/contact?id=<id>`
Cập nhật cửa hàng. **Admin only.**

Updatable fields: `name`, `address`, `phone`, `email`, `hours`, `googleMapsUrl`.

**Response 200**
```json
{ "ok": true, "data": { "id": "store_1234567890" } }
```

---

### `DELETE /api/contact?id=<id>`
Xóa cửa hàng (hard delete). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "store_1234567890" } }
```

---

## Orders

Đơn hàng mua sản phẩm.

Status hợp lệ: `pending` | `processing` | `completed` | `cancelled`

### `GET /api/orders`
Lấy danh sách đơn hàng. Public.

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `status` | Lọc theo status |
| `page`, `limit` | Phân trang |

**Response 200** — xem [Pagination](#pagination)

---

### `GET /api/orders/:id`
Lấy 1 đơn hàng theo id. Public.

**Response 200**
```json
{ "ok": true, "data": { "id": "ORD-A1B2C3", "customerName": "...", ... } }
```

**Response 404**
```json
{ "ok": false, "message": "Not found" }
```

---

### `POST /api/orders`
Tạo đơn hàng mới. Public.

**Body**
```json
{
  "customerName": "Nguyễn Văn A",
  "customerPhone": "0901234567",
  "customerAddress": "123 Đường ABC, Q.1",
  "notes": "Giao buổi sáng",
  "items": [
    {
      "productId": "prd_1234567890",
      "quantity": 2
    }
  ],
  "paymentMethod": "vietqr"
}
```

Fields bắt buộc: `customerName`, `customerPhone`, `customerAddress`, `items` (ít
nhất 1 item với `productId`, `quantity` là số nguyên dương).

`paymentMethod` nhận `cod` hoặc `vietqr`, mặc định là `cod`.

Backend lấy `productName` và `price` từ MongoDB theo `productId`. Giá hoặc tên do
frontend gửi lên sẽ bị bỏ qua. `totalAmount` được tính từ giá trong database.

**Response 200**
```json
{
  "ok": true,
  "data": {
    "id": "ORD-A1B2C3",
    "checkoutToken": "<random-capability-token>",
    "paymentMethod": "vietqr",
    "paymentStatus": "unpaid"
  }
}
```

`checkoutToken` chỉ trả một lần khi tạo order. Frontend phải giữ token này để
tạo QR và truy vấn trạng thái thanh toán, nhưng không lưu vào log hoặc URL.

---

### `POST /api/orders/:id/payment/vietqr`
Tạo VietQR động cho đơn hàng.

**Header**

```http
X-Checkout-Token: <checkoutToken>
```

Backend luôn dùng `totalAmount` đã tính từ giá sản phẩm trong database, không
nhận số tiền từ frontend.

**Response 200**

```json
{
  "ok": true,
  "data": {
    "orderId": "ORD-A1B2C3",
    "amount": 300000,
    "paymentStatus": "pending",
    "qrCode": "000201...",
    "qrLink": "https://...",
    "content": "GIAYCUNG ORDA1B2C3",
    "bankCode": "MB",
    "bankAccount": "0123456789",
    "bankAccountName": "GIAY CUNG"
  }
}
```

Lỗi thường gặp: `401` sai checkout token, `409` đơn đã hủy/đã thanh toán,
`502` VietQR lỗi hoặc timeout, `503` thiếu cấu hình VietQR.

---

### `GET /api/orders/:id/payment-status`
Truy vấn trạng thái thanh toán để frontend polling.

**Header**

```http
X-Checkout-Token: <checkoutToken>
```

**Response 200**

```json
{
  "ok": true,
  "data": {
    "orderId": "ORD-A1B2C3",
    "paymentStatus": "paid",
    "paidAmount": 300000,
    "paidAt": "2026-06-13T10:12:30.000Z"
  }
}
```

---

### `PATCH /api/orders/:id`
Cập nhật status đơn hàng. **Admin only.**

**Body**
```json
{ "status": "processing" }
```

**Response 200**
```json
{ "ok": true, "data": { "id": "ORD-A1B2C3", "status": "processing" } }
```

---

### `DELETE /api/orders/:id`
Soft delete đơn hàng (set status → `cancelled`). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "ORD-A1B2C3" } }
```

---

## VietQR Callback

Hai endpoint server-to-server để VietQR gửi thông báo giao dịch. Không dùng
admin JWT và không gọi từ frontend.

### `POST /vqr/api/token_generate`

VietQR lấy callback token bằng Basic Authentication.

```http
Authorization: Basic base64(VIETQR_CALLBACK_USERNAME:VIETQR_CALLBACK_PASSWORD)
```

**Response 200**

```json
{
  "access_token": "<jwt-hs256>",
  "token_type": "Bearer",
  "expires_in": 300
}
```

### `POST /vqr/bank/api/transaction-sync`

VietQR gửi giao dịch ngân hàng bằng Bearer token nhận từ endpoint trên.

Backend chỉ xác nhận thanh toán khi loại giao dịch, tài khoản nhận, mã đơn, nội
dung và số tiền đều khớp. `transactionid` được xử lý idempotent.

```http
Authorization: Bearer <callback-token>
```

```json
{
  "bankaccount": "0123456789",
  "amount": 300000,
  "transType": "C",
  "content": "GIAYCUNG ORDA1B2C3",
  "transactionid": "TX123",
  "transactiontime": 1781322614000,
  "referencenumber": "REF123",
  "orderId": "ORDA1B2C3"
}
```

---

## Service Orders

Đơn dịch vụ giặt/vệ sinh giày.

### Trạng thái — 3 trục độc lập

Mỗi đơn dịch vụ có **3 trường trạng thái tách biệt** để FE/BE đồng bộ:

| Trường | Giá trị | Ý nghĩa |
|---|---|---|
| `status` | `pending` \| `processing` \| `completed` \| `cancelled` | Tiến độ công việc giặt giày |
| `paymentMethod` | `null` \| `cash` \| `vietqr` | Phương thức thanh toán. **`null` khi tạo đơn** — chỉ được set khi có hành động thanh toán thực tế (tạo QR ⇒ `vietqr`; admin xác nhận đã nhận tiền mặt ⇒ `cash`) |
| `paymentStatus` | `unpaid` \| `pending` \| `paid` \| `failed` \| `refunded` | Trạng thái thanh toán |

Quy tắc:

- `status` và `paymentStatus` **độc lập**: đơn có thể `completed` (giặt xong) trong khi `paymentStatus=unpaid` (chờ khách đến lấy + trả tiền) — và ngược lại.
- `paymentStatus=pending` nghĩa là *đã tạo QR / đang chờ chuyển khoản* (đừng nhầm với `status=pending`).
- `paymentMethod` **không** được set khi tạo đơn và **không** sửa được qua `PATCH`. Nó là kết quả của hành động:
  - Tạo QR (qua admin hoặc khách bấm "Thanh toán QR" ở trang tra cứu) ⇒ `vietqr`.
  - Admin click "Đã thu tiền mặt" ⇒ `cash`.
- Đơn `cancelled` không thể chuyển sang `paid` (cả VietQR callback và confirm thủ công đều bị BE từ chối với 409).
- `confirm-cash` có thể chạy trên đơn đang `vietqr` pending (khách đổi ý trả tiền mặt) — BE ghi đè `paymentMethod=cash`. VietQR callback đến sau sẽ bị từ chối vì `paymentStatus=paid`.

Status giày: `received` | `processing` | `completed`

---

### `GET /api/service-orders`
Lấy danh sách đơn dịch vụ kèm giày. Public.

**Query params (tuỳ chọn)**
| Param | Mô tả |
|---|---|
| `status` | Lọc theo status đơn |
| `page`, `limit` | Phân trang |

**Response 200** — xem [Pagination](#pagination)  
Mỗi item trong `data` có thêm field `shoes: [...]`.

---

### `GET /api/service-orders/track?order=<orderNumber>`
Tra cứu đơn theo mã đơn hàng. Public (dùng cho khách tra cứu).

**Query params** (dùng một trong ba)
| Param | Mô tả |
|---|---|
| `order` | Mã đơn, VD: `ORD-001` |
| `orderNumber` | Tương tự `order` |
| `code` | Tương tự `order` |

**Response 200**
```json
{ "ok": true, "order": { "id": "ord_...", "orderNumber": "ORD-001", ... } }
```

**Response 404**
```json
{ "ok": false, "message": "Not found" }
```

---

### `GET /api/service-orders/:id`
Lấy 1 đơn theo id nội bộ. Public.

**Response 200**
```json
{ "ok": true, "order": { "id": "ord_...", "orderNumber": "ORD-001", ... } }
```

---

### `POST /api/service-orders`
Tạo đơn dịch vụ mới. **Admin only.**

**Body**
```json
{
  "customerName": "Nguyễn Văn A",
  "customerPhone": "0901234567",
  "totalAmount": 200000,
  "assignedTo": "Nhân viên B",
  "status": "pending",
  "createdDate": "2024-01-15",
  "orderNumber": "ORD-010",
  "paymentNote": ""
}
```

Fields bắt buộc: `customerName`, `customerPhone`.  
`orderNumber` tự sinh tăng dần (`ORD-001`, `ORD-002`, ...) nếu không truyền.  
`createdDate` mặc định là ngày hiện tại (YYYY-MM-DD).  
**Không nhận `paymentMethod`** — đơn vừa tạo luôn có `paymentMethod=null`; method chỉ được set khi có hành động thanh toán (`confirm-cash` ⇒ `cash`; `payment/vietqr` ⇒ `vietqr`). Nếu FE lỡ gửi field này, BE bỏ qua.

**Response 200**
```json
{
  "ok": true,
  "data": {
    "id": "ord_1234567890",
    "orderNumber": "ORD-010",
    "paymentMethod": null,
    "paymentStatus": "unpaid"
  }
}
```

---

### `PATCH /api/service-orders/:id`
Cập nhật đơn dịch vụ. **Admin only.**

**Body** (chỉ truyền field cần cập nhật)
```json
{
  "status": "completed",
  "assignedTo": "Nhân viên C",
  "totalAmount": 250000,
  "paymentNote": ""
}
```

Updatable fields: `status`, `assignedTo`, `totalAmount`, `paymentNote`.

`paymentMethod` **không** sửa được qua endpoint này — nếu FE gửi lên, BE bỏ qua. Đổi `status` không bị ràng buộc bởi `paymentStatus`. Hai trục độc lập.

**Response 200**
```json
{
  "ok": true,
  "data": {
    "id": "ord_1234567890",
    "paymentMethod": null,
    "paymentStatus": "unpaid"
  }
}
```

---

### `DELETE /api/service-orders/:id`
Xóa đơn dịch vụ. **Admin only.**

Hard delete order + soft-delete tất cả giày thuộc đơn (set `deleted=true`).

**Response 200**
```json
{ "ok": true, "data": { "id": "ord_1234567890" } }
```

---

### Service Order — Payment endpoints

Tất cả endpoint thanh toán dưới đây thao tác trên 3 trục `status`, `paymentMethod`, `paymentStatus` đã mô tả ở đầu mục Service Orders.

#### `GET /api/service-orders/track/:code/payment-status`
Public. Khách dùng `orderNumber` để tra trạng thái thanh toán + thông tin QR (rate-limit 240 req/15 phút).

**Response 200**

```json
{
  "ok": true,
  "data": {
    "orderId": "ord_...",
    "orderNumber": "ORD-001",
    "paymentMethod": "vietqr",
    "paymentStatus": "pending",
    "paymentNote": "",
    "amount": 250000,
    "paidAmount": 0,
    "paidAt": null,
    "qrCode": "000201...",
    "qrLink": "https://...",
    "content": "GIAYCUNG ORD0011A2B",
    "bankCode": "MB",
    "bankAccount": "0123456789",
    "bankAccountName": "GIAY CUNG"
  }
}
```

FE dùng response này để: vẽ QR (`qrCode` là chuỗi EMVCo, có thể render thành ảnh QR), hiển thị nội dung chuyển khoản, và polling `paymentStatus` đến khi `=== "paid"`. **QR không có hạn** — VietQR/EMVCo không expire; BE giữ idempotent (tạo lại = trả về QR cũ) đến khi đơn `paid` hoặc `cancelled`.

---

#### `POST /api/service-orders/track/:code/payment/vietqr`
Public. Khách bấm "Thanh toán bằng QR" trên trang tra cứu → BE tạo (hoặc trả về QR còn hiệu lực — idempotent trong 15 phút). Rate-limit 20 req/10 phút.

Side effect: BE tự đặt `paymentMethod=vietqr` và `paymentStatus=pending` nếu trước đó là `cash`/`bank_transfer`.

**Response 200** — giống `GET payment-status` ở trên.

Lỗi: `409` đơn đã `cancelled` hoặc đã `paid`; `502` VietQR provider lỗi; `503` thiếu env var VietQR.

---

#### `POST /api/service-orders/:id/payment/vietqr`
**Admin only.** Tạo QR cho đơn theo `id` hoặc `orderNumber`. Idempotent — đơn đã có QR (chưa `paid`, chưa `cancelled`) thì luôn trả lại QR cũ, không gọi VietQR lần nữa.

Side effect: tự đặt `paymentMethod=vietqr`.

**Response 200** — giống public version.

---

#### `POST /api/service-orders/:id/payment/confirm-cash`
**Admin only.** Xác nhận đã nhận tiền mặt. Set `paymentMethod=cash` + `paymentStatus=paid`. Hoạt động kể cả khi đơn chưa có method **hoặc** đang ở `paymentMethod=vietqr` (khách đổi ý trả tiền mặt khi đến cửa hàng).

**Body**
```json
{
  "note": "Khách thanh toán tiền mặt khi nhận giày",
  "paidAmount": 250000
}
```

- `note` ghi chú nội bộ (tuỳ chọn).
- `paidAmount` tuỳ chọn — mặc định lấy `totalAmount`.

**Response 200**
```json
{
  "ok": true,
  "data": {
    "id": "ord_...",
    "orderNumber": "ORD-001",
    "paymentMethod": "cash",
    "paymentStatus": "paid",
    "paidAmount": 250000,
    "paidAt": "2026-06-29T07:30:00.000Z"
  }
}
```

Lỗi: `409` đơn `cancelled` hoặc đã `paid`.

---

#### `POST /api/service-orders/:id/payment/manual-mark-paid`
**Admin only.** Override khẩn cấp — dùng khi đơn `vietqr` mà callback không về (khách đã chuyển khoản, BE không nhận callback từ VietQR), admin đối soát thủ công với sao kê ngân hàng và đánh dấu đã thanh toán. Audit trail bắt buộc.

**Body**
```json
{
  "reason": "Khách gửi ảnh sao kê, BE callback không nhận được",
  "transactionRef": "MANUAL-REF-001",
  "paidAmount": 250000
}
```

- `reason` **bắt buộc** (≥ 5 ký tự).
- `transactionRef` **bắt buộc**.
- `paidAmount` tuỳ chọn — mặc định lấy `totalAmount`.

Khác với `confirm`: `manual-mark-paid` luôn yêu cầu reason để ghi audit, dùng cho trường hợp ngoại lệ. `confirm` dùng cho flow chính của cash / bank_transfer.

---

### `POST /api/service-orders/:id/shoes`
Thêm giày vào đơn. **Admin only.**

**Body**
```json
{
  "name": "Nike Air Force 1",
  "service": "Giặt chuyên sâu",
  "status": "received",
  "images": ["https://...", "https://..."],
  "notes": "Cẩn thận phần đế"
}
```

Fields bắt buộc: `name`, `service`.  
`status` mặc định: `"received"`. `images` là mảng URL.

**Response 200**
```json
{ "ok": true, "data": { "id": "shoe_1234567890" } }
```

---

### `PATCH /api/service-orders/:id/shoes/:shoeId`
Cập nhật thông tin giày. **Admin only.**

**Body** (chỉ truyền field cần cập nhật)
```json
{
  "status": "completed",
  "images": ["https://..."],
  "notes": "Hoàn thành"
}
```

Updatable fields: `name`, `service`, `status`, `images`, `notes`, `deleted`.

**Response 200**
```json
{ "ok": true, "data": { "id": "shoe_1234567890" } }
```

---

### `DELETE /api/service-orders/:id/shoes/:shoeId`
Soft-delete giày (set `deleted=true`). **Admin only.**

**Response 200**
```json
{ "ok": true, "data": { "id": "shoe_1234567890" } }
```

---

## Mã lỗi chung

| HTTP Status | Ý nghĩa |
|---|---|
| 200 | Thành công |
| 400 | Thiếu hoặc sai dữ liệu đầu vào |
| 401 | Chưa xác thực hoặc token không hợp lệ |
| 404 | Không tìm thấy resource |
| 500 | Lỗi server (thường do MongoDB hoặc thiếu env var) |

Mọi lỗi đều trả `{ "ok": false, "message": "..." }`.
