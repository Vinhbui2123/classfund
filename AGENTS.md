# SPEC.md — Hệ thống Quản lý Quỹ Lớp (Class Fund App)

<aside>
📌

Tài liệu đặc tả (SPEC) dành cho AI coding agent để **xây dựng hoàn chỉnh** ứng dụng Quản lý Quỹ Lớp (30 thành viên) trên nền tảng **Next.js 15 (App Router) + Vercel + Neon/Turso**. AI hãy đọc toàn bộ trước khi sinh mã. Mọi quyết định kỹ thuật phải tuân theo phần *Constraints* và *Acceptance Criteria*.

</aside>

# 1. Tổng quan dự án

**Tên app:** ClassFund (Quỹ Lớp)

**Mục tiêu:** Quản lý quỹ lớp học cho tập thể tối đa **30 thành viên**, gồm:

- Quản lý danh sách thành viên
- Quản lý nhiều **đợt thu** song song (campaigns)
- Ghi nhận các **khoản chi** (expenses) để đối soát tổng quỹ
- Tìm kiếm thành viên theo thời gian thực + hiển thị **mã QR VietQR động** cho thanh toán
- 2 không gian giao diện: **Admin** (ban cán sự) và **Public** (toàn bộ thành viên xem)
- Import danh sách thành viên / đợt thu bằng **CSV**
- Triển khai miễn phí trên **Vercel**

**Đối tượng người dùng:**

- **Admin (1–2 người):** Ban cán sự lớp — toàn quyền CRUD.
- **Public (30 thành viên):** Chỉ xem trạng thái nợ của bản thân + nhận mã QR thanh toán.

---

# 2. Tech Stack bắt buộc

| Tầng | Công nghệ | Ghi chú |
| --- | --- | --- |
| Framework | **Next.js 15+ (App Router)** | React 19, Server Components mặc định |
| Ngôn ngữ | **TypeScript (strict mode)** | `strict: true` trong `tsconfig.json` |
| Styling | **Tailwind CSS v4**  • **shadcn/ui** | Headless components |
| Database | **Neon (Postgres)** *hoặc* **Turso (libSQL)** | Mặc định chọn **Neon**; có flag để fallback Turso |
| ORM | **Drizzle ORM** | Type-safe, hỗ trợ cả Postgres và SQLite |
| Validation | **Zod** | Validate form, CSV row, Server Action input |
| CSV parsing | **react-papaparse** | Bắt buộc bật `worker: true` |
| QR Code | **qrcode** (npm) phía client | Sinh QR EMVCo-compliant tại browser, **không** dùng API bên thứ ba |
| Auth | **Edge Middleware + Shared Password + HttpOnly Cookie** | Không dùng NextAuth/Clerk |
| Hash | **bcryptjs** hoặc Web Crypto `SHA-256 + salt` | Để hash `ADMIN_PASSWORD` khi so sánh |
| Deploy | **Vercel Hobby Tier** | CI/CD qua GitHub |

<aside>
⚠️

Không được thêm thư viện ngoài danh sách trên trừ khi có lý do kỹ thuật rõ ràng. Tuyệt đối **không** dùng Prisma (nặng cold-start), không dùng `moment.js`, không dùng `axios` (dùng `fetch` native).

</aside>

---

# 3. Cấu trúc thư mục

```
classfund/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 # Trang xem công khai: search + bảng status
│   │   └── _components/
│   │       ├── SearchBar.tsx
│   │       ├── MemberTable.tsx
│   │       └── QRModal.tsx
│   ├── admin/
│   │   ├── layout.tsx               # Bảo vệ bằng middleware
│   │   ├── page.tsx                 # Dashboard tổng quan
│   │   ├── setup/page.tsx           # Tab Setup: CSV import + tạo campaign
│   │   ├── collection/page.tsx      # Tab Thu quỹ
│   │   ├── expenses/page.tsx        # Tab Chi tiêu
│   │   └── _components/
│   │       ├── CSVDropzone.tsx
│   │       ├── CampaignForm.tsx
│   │       ├── PaymentToggle.tsx
│   │       └── ExpenseForm.tsx
│   ├── login/page.tsx
│   ├── api/
│   │   └── auth/route.ts            # POST /api/auth (verify password, set cookie)
│   ├── actions/
│   │   ├── members.ts               # Server Actions cho members
│   │   ├── campaigns.ts
│   │   ├── transactions.ts
│   │   └── expenses.ts
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   ├── db/
│   │   ├── schema.ts                # Drizzle schema
│   │   ├── index.ts                 # DB client
│   │   └── queries.ts               # Reusable queries
│   ├── vietqr.ts                    # Hàm sinh chuỗi EMVCo VietQR
│   ├── normalize.ts                 # Chuẩn hoá tiếng Việt (bỏ dấu, lowercase)
│   ├── auth.ts                      # Hash & verify password
│   └── config.ts                    # Env config (bank info, etc.)
├── middleware.ts                    # Edge middleware bảo vệ /admin/*
├── drizzle.config.ts
├── .env.local.example
└── README.md
```

---

# 4. Lược đồ Cơ sở dữ liệu (Drizzle Schema)

<aside>
💡

Mọi cột tiền tệ dùng **BIGINT (đơn vị: VND)** — KHÔNG dùng FLOAT. Mọi cột text tiếng Việt dùng **VARCHAR/TEXT** với encoding UTF-8.

</aside>

## 4.1. Bảng `members`

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | `serial` / `uuid` | PRIMARY KEY |
| `full_name` | `varchar(100)` | NOT NULL |
| `normalized_name` | `varchar(100)` | NOT NULL, index (cho search) |
| `student_id` | `varchar(50)` | NULLABLE, UNIQUE |
| `contact_info` | `varchar(100)` | NULLABLE |
| `created_at` | `timestamptz` | DEFAULT NOW() |

## 4.2. Bảng `campaigns`

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | `serial` / `uuid` | PRIMARY KEY |
| `name` | `varchar(150)` | NOT NULL |
| `description` | `text` | NULLABLE |
| `target_amount` | `bigint` | NOT NULL, > 0 |
| `status` | `varchar(10)` | DEFAULT `'open'`, IN (`open`, `closed`) |
| `created_at` | `timestamptz` | DEFAULT NOW() |
| `closed_at` | `timestamptz` | NULLABLE |

## 4.3. Bảng `transactions` (giao dịch thu)

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | `serial` / `uuid` | PRIMARY KEY |
| `member_id` | FK → `members.id` | NOT NULL, ON DELETE RESTRICT |
| `campaign_id` | FK → `campaigns.id` | NOT NULL, ON DELETE RESTRICT |
| `amount_paid` | `bigint` | NOT NULL, > 0 |
| `payment_method` | `varchar(20)` | DEFAULT `'cash'`, IN (`cash`, `transfer`) |
| `note` | `text` | NULLABLE |
| `payment_date` | `timestamptz` | DEFAULT NOW() |

**Index bắt buộc:** `(member_id, campaign_id)` composite index.

## 4.4. Bảng `expenses`

| Cột | Kiểu | Ràng buộc |
| --- | --- | --- |
| `id` | `serial` / `uuid` | PRIMARY KEY |
| `description` | `varchar(200)` | NOT NULL |
| `amount` | `bigint` | NOT NULL, > 0 |
| `expense_date` | `date` | NOT NULL, DEFAULT TODAY |
| `created_at` | `timestamptz` | DEFAULT NOW() |

## 4.5. Công thức nghiệp vụ

```
TotalBalance = SUM(transactions.amount_paid) - SUM(expenses.amount)
Debt(member, campaign) = campaign.target_amount - SUM(transactions.amount_paid WHERE member_id=? AND campaign_id=?)
MemberStatus(member) = "paid" if Debt = 0 across ALL open campaigns, else "owing"
```

---

# 5. Authentication & Bảo mật

## 5.1. Cơ chế

- **Shared Password Authentication.** Một mật khẩu duy nhất cho admin, lưu hash trong env `ADMIN_PASSWORD_HASH`.
- Khi user POST `/api/auth` với mật khẩu đúng → tạo cookie ký số (signed) `auth_token`.
- Cookie có giá trị = `HMAC-SHA256(timestamp + secret)` để chống forge.

## 5.2. Cookie Configuration (BẮT BUỘC)

```tsx
response.cookies.set('auth_token', token, {
	httpOnly: true,
	secure: true,
	sameSite: 'strict',
	path: '/',
	maxAge: 60 * 60 * 24 * 7, // 7 ngày
})
```

## 5.3. Middleware (`middleware.ts`)

- Chạy trên **Edge Runtime**.
- Matcher: `['/admin/:path*']`.
- Logic:
    1. Đọc cookie `auth_token`.
    2. Verify HMAC. Nếu invalid/expired → `NextResponse.redirect('/login?from=...')`.
    3. Nếu valid → `NextResponse.next()`.

## 5.4. Env vars cần thiết

```
DATABASE_URL=postgres://...
ADMIN_PASSWORD_HASH=<bcrypt hash>
AUTH_SECRET=<random 32+ bytes hex>
BANK_BIN=970422            # VD: MB Bank
BANK_ACCOUNT_NUMBER=0123456789
BANK_ACCOUNT_NAME=NGUYEN VAN A
```

---

# 6. Sinh mã VietQR (Client-side, EMVCo)

<aside>
🔐

Không gọi API bên ngoài ([img.vietqr.io](http://img.vietqr.io)). Sinh hoàn toàn ở client để bảo vệ riêng tư + zero latency + hoạt động offline.

</aside>

## 6.1. Cấu trúc EMVCo VietQR (tóm tắt)

```
00 02 01                          # Payload Format Indicator
01 02 12                          # Point of Initiation (12 = dynamic)
38 ...                            # Merchant Account Info (NAPAS)
   00 10 A000000727               # GUID
   01 ...                         # Beneficiary Org
      00 06 <BANK_BIN>
      01 nn <ACCOUNT_NUMBER>
   02 08 QRIBFTTA                 # service code (account transfer)
53 03 704                         # Currency = VND
54 nn <AMOUNT>                    # Transaction Amount
58 02 VN                          # Country
62 ...                            # Additional Data
   08 nn <ADD_INFO>               # Purpose of transaction
63 04 <CRC16-CCITT>               # CRC checksum (FFFF init, poly 0x1021)
```

## 6.2. API hàm `buildVietQRString(amount, addInfo): string`

- Input: `amount: number` (VND, integer), `addInfo: string` (ASCII, max 25 chars, đã bỏ dấu).
- Output: chuỗi EMVCo hoàn chỉnh, kèm CRC16-CCITT.
- Sau đó render bằng `qrcode` lib lên `<canvas>` hoặc `<svg>`.

## 6.3. Format `addInfo`

```
QUYLOP_<TENMEMBER_KHONGDAU>_<TENCAMPAIGN_KHONGDAU>
```

Ví dụ: `QUYLOP_NGUYENVANA_DANGOAI` (≤ 25 chars, viết liền, ASCII-only).

---

# 7. CSV Import

## 7.1. Schema CSV cho `members`

```
full_name,student_id,contact_info
Nguyễn Văn A,2221050001,0901234567
Trần Thị B,2221050002,
```

- `full_name` bắt buộc.
- `student_id`, `contact_info` tùy chọn.
- Hệ thống tự sinh `normalized_name`.

## 7.2. Quy trình

1. Dropzone (drag-and-drop) trên Tab Setup.
2. `react-papaparse` parse với `worker: true`, `header: true`, `skipEmptyLines: true`.
3. Hiển thị preview 5 dòng đầu.
4. Validate bằng Zod (`memberCsvSchema.array()`).
5. Submit qua Server Action `importMembers(rows)`.
6. Server Action gọi 1 query duy nhất: `INSERT ... ON CONFLICT (student_id) DO NOTHING`.
7. Trả về `{ inserted: number, skipped: number, errors: [...] }`.

## 7.3. Constraint

- 1 lần import = 1 round-trip DB.
- Nếu có dòng lỗi → **transaction rollback toàn bộ** (atomic).
- Tối đa 100 dòng/lần upload.

---

# 8. Đặc tả Giao diện

## 8.1. Public View (`/`)

**Layout:**

```
┌────────────────────────────────────────┐
│  🏷️ ClassFund                          │
│                                        │
│   [🔍 Tìm tên của bạn...           ]   │
│                                        │
│   Tổng quỹ hiện tại: 4.250.000 ₫       │
│                                        │
│   ┌──────────────────────────────┐    │
│   │ STT  Tên          Trạng thái │    │
│   │  1   Nguyễn A     🟢 Đã đóng │    │
│   │  2   Trần B       🔴 Còn nợ  │    │
│   │  ...                          │    │
│   └──────────────────────────────┘    │
└────────────────────────────────────────┘
```

- **Search:** debounce 150ms, fuzzy match trên `normalized_name`.
- Toàn bộ 30 members + status được preload (SSR) — search hoàn toàn client-side với `useMemo`.
- Click vào hàng "Còn nợ" → mở **QRModal**.

**QRModal hiển thị:**

- Tên thành viên
- Danh sách đợt thu còn nợ (mỗi đợt: tên + số tiền cần đóng)
- Tổng cần chuyển
- Mã QR VietQR (sinh client) cho **tổng cần chuyển**
- Nội dung chuyển khoản (`addInfo`) — có nút **Copy**
- Số tài khoản — có nút **Copy**
- Tên ngân hàng (lookup từ `BANK_BIN`)

## 8.2. Admin Dashboard (`/admin`)

3 tabs:

### Tab 1: Setup

- Phần "Danh sách thành viên": Dropzone CSV + nút "Thêm thủ công".
- Phần "Đợt thu": Form tạo campaign mới (name, target_amount, description) + bảng list campaigns đang mở/đóng + nút đóng/mở.

### Tab 2: Thu quỹ (Collection)

- Dropdown chọn `campaign` đang mở.
- Bảng: mỗi dòng = 1 member. Cột: Tên | Đã đóng | Còn nợ | Toggle.
- Click Toggle → mở popover nhập `amount_paid` (mặc định = `target_amount`) + chọn `payment_method` → Server Action `recordTransaction`.
- Hỗ trợ **trả góp** (nộp một phần).

### Tab 3: Chi tiêu (Expenses)

- Form 3 trường: `expense_date` | `description` | `amount`.
- Bảng lịch sử chi (sắp xếp date DESC).
- Mỗi dòng có nút **Sửa** / **Xóa**.
- Card "Số dư quỹ hiện tại" cố định ở góc phải (sticky), cập nhật realtime sau mỗi mutation.

## 8.3. Login Page (`/login`)

- 1 input password + 1 nút submit.
- Hiển thị error message nếu sai.
- Rate-limit: chặn IP sau 5 lần sai trong 5 phút (lưu trong memory hoặc bảng phụ).

---

# 9. Server Actions API Surface

```tsx
// app/actions/members.ts
async function importMembers(rows: MemberCsvRow[]): Promise<ImportResult>
async function createMember(data: MemberInput): Promise<Member>
async function updateMember(id: string, data: Partial<MemberInput>): Promise<Member>
async function deleteMember(id: string): Promise<void>

// app/actions/campaigns.ts
async function createCampaign(data: CampaignInput): Promise<Campaign>
async function closeCampaign(id: string): Promise<Campaign>
async function reopenCampaign(id: string): Promise<Campaign>

// app/actions/transactions.ts
async function recordTransaction(input: TxInput): Promise<Transaction>
async function deleteTransaction(id: string): Promise<void>

// app/actions/expenses.ts
async function createExpense(data: ExpenseInput): Promise<Expense>
async function updateExpense(id: string, data: Partial<ExpenseInput>): Promise<Expense>
async function deleteExpense(id: string): Promise<void>
```

**Quy tắc chung:**

- Mọi Server Action **PHẢI** verify auth cookie ở dòng đầu tiên.
- Mọi input **PHẢI** chạy qua Zod schema.
- Mọi mutation thành công → gọi `revalidatePath('/admin')` và `revalidatePath('/')`.

---

# 10. Performance & UX

- **First Contentful Paint < 1s** trên 4G.
- Search response (client-side) **< 16ms** (60fps).
- Cold start DB (Neon) **< 700ms** ở lần đầu trong ngày.
- QR render **< 50ms** sau khi mở modal.
- Tất cả mutations dùng **`useTransition` + optimistic update** để UI không lag.

---

# 11. Acceptance Criteria (Definition of Done)

Một implementation được coi là HOÀN CHỈNH khi vượt qua TẤT CẢ checklist sau:

- [ ]  `pnpm dev` chạy local không lỗi.
- [ ]  `pnpm build` build thành công, không warning TypeScript.
- [ ]  Schema Drizzle khớp Section 4. `pnpm drizzle-kit push` chạy được.
- [ ]  Truy cập `/admin` khi chưa login → redirect `/login`.
- [ ]  Login đúng password → redirect về `/admin`.
- [ ]  Import CSV 30 dòng → DB có đủ 30 members + `normalized_name` đúng.
- [ ]  Tạo 2 campaigns song song, đợt 1 (100k) và đợt 2 (50k) → hiển thị chính xác ở public view.
- [ ]  Ghi nhận 1 transaction `(memberA, campaign1, 100000)` → status memberA chuyển 🟢 cho campaign1.
- [ ]  Nhập 1 expense 200k → "Số dư quỹ" = (tổng thu) − 200000.
- [ ]  Search "nguyen" hoặc "Nguyễn" hoặc "NGUYỄN" đều trả về kết quả giống nhau.
- [ ]  Click member còn nợ → modal mở, QR scan được bằng app ngân hàng thật (test với MB Bank/VCB).
- [ ]  Copy số TK + Copy nội dung CK hoạt động.
- [ ]  Deploy lên Vercel thành công với env vars đầy đủ.
- [ ]  Lighthouse score: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95.
- [ ]  Không có request nào tới `vietqr.io` hoặc bất kỳ API bên ngoài nào ở runtime.
- [ ]  Cookie có đủ flags `HttpOnly`, `Secure`, `SameSite=Strict`.

---

# 12. Roadmap Triển khai (cho AI)

<aside>
🤖

AI coding agent hãy thực hiện **TUẦN TỰ** các bước dưới đây. Sau mỗi bước, commit Git với message rõ ràng.

</aside>

1. **Init project**: `pnpm create next-app@latest classfund --typescript --tailwind --app --eslint`.
2. **Cấu hình**: Tailwind v4, shadcn/ui init, drizzle-kit, env file.
3. **DB layer**: Viết `lib/db/schema.ts` theo Section 4. Generate + push migration.
4. **Auth**: Viết `lib/auth.ts`, `middleware.ts`, `app/login/page.tsx`, `app/api/auth/route.ts`.
5. **VietQR core**: Viết `lib/vietqr.ts` + unit test với 3 mẫu thật.
6. **Server Actions**: Tất cả file trong `app/actions/`.
7. **Admin UI**: Lần lượt 3 tabs (Setup → Collection → Expenses).
8. **Public UI**: Search + Table + QRModal.
9. **CSV Import**: Dropzone + papaparse + import action.
10. **Polish**: Loading states, error boundaries, empty states, mobile responsive.
11. **Deploy**: Push lên GitHub, connect Vercel, set env vars, smoke test.
12. **README**: Hướng dẫn setup + screenshots.

---

# 13. Phụ lục: Bank BIN Codes (NAPAS)

| BIN | Bank |
| --- | --- |
| 970415 | VietinBank |
| 970436 | Vietcombank |
| 970418 | BIDV |
| 970422 | MB Bank |
| 970407 | Techcombank |
| 970432 | VPBank |
| 970416 | ACB |
| 970423 | TPBank |
| 970403 | Sacombank |
| 970454 | VietCapitalBank |

*Danh sách đầy đủ: tra cứu NAPAS hoặc lib `vietqr-bin-codes`.*

---

# 14. Lưu ý cuối

- **Ưu tiên đơn giản hơn là phô diễn kỹ thuật.** Code phải đọc được bởi sinh viên năm 3.
- **Mọi text UI bằng tiếng Việt.** Mọi identifier code bằng tiếng Anh.
- **Tiền tệ:** luôn format `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
- **Date:** luôn dùng `Intl.DateTimeFormat('vi-VN')` — KHÔNG dùng `moment`/`dayjs`.
- **Nếu gặp ambiguity:** chọn giải pháp ít dependency hơn, ít cấu hình hơn.

<aside>
✅

Kết thúc SPEC. AI hãy đọc lại 1 lần nữa trước khi bắt đầu code.

</aside>