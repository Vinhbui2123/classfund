# Prompt: Redesign UI — ClassFund (Hệ thống Quản lý Quỹ Lớp)

## Bối cảnh

Đây là app Next.js 15 (App Router) + React 19 + **Tailwind v4** + Lucide icons.
Gồm 2 phần: Public portal (`app/(public)`) và Admin panel (`app/admin/*`).
Người dùng chủ yếu mở bằng **điện thoại**. Nội dung tiếng Việt.
Mục tiêu: nâng cấp giao diện cho hiện đại, sạch, chuyên nghiệp, dễ đọc số tiền — KHÔNG đổi logic/nghiệp vụ, chỉ đổi UI/UX và style.

## Nguyên tắc thiết kế (BẮT BUỘC tuân thủ)

1. Chỉ dùng đúng design tokens bên dưới. KHÔNG dùng màu Tailwind tùy tiện (no `blue-500`, `green-500` rải rác).
2. Một màu chủ đạo duy nhất (brand) dùng cho nút chính, link, focus ring.
3. Hệ thống màu semantic cho trạng thái tiền: tốt = emerald, cảnh báo = amber, lỗi/chưa đóng = rose.
4. Số tiền là thông tin quan trọng nhất: font đậm, cỡ lớn, canh phải, dùng `tabular-nums`, format `1.000.000 ₫`.
5. Mobile-first, responsive. Bảng phải xử lý tốt trên màn hình hẹp (cho phép scroll ngang hoặc chuyển sang dạng card trên mobile).
6. Hỗ trợ dark mode bằng class `dark:`.
7. Accessibility: focus ring rõ ràng, contrast đạt WCAG AA, mọi nút icon có `aria-label`.

## Design Tokens

### Màu (định nghĩa trong globals.css dạng CSS variables + map vào Tailwind theme)

- Brand: emerald-600 (#059669), hover emerald-700 (#047857)
- Nền trang: slate-50 (#f8fafc) / dark: slate-950
- Bề mặt (card): white / dark: slate-900, viền slate-200 / dark: slate-800
- Chữ chính: slate-900 / dark: slate-100
- Chữ phụ: slate-500 / dark: slate-400
- Tốt (Đủ/Dư): text emerald-700, bg emerald-50 / dark tương ứng
- Cảnh báo (Còn thiếu): text amber-700, bg amber-50
- Lỗi (Chưa đóng): text rose-700, bg rose-50

### Typography

- Font: Inter (đã có), số dùng `font-variant-numeric: tabular-nums`
- Heading trang: text-2xl/3xl font-bold tracking-tight
- Số tiền lớn (BalanceCard): text-3xl/4xl font-bold tabular-nums
- Body: text-sm/base, chữ phụ text-slate-500

### Spacing & shape

- Bo góc: card `rounded-2xl`, nút/input `rounded-xl`, badge `rounded-full`
- Bóng: card dùng `shadow-sm` + `border`, modal `shadow-xl`
- Padding card: `p-5` đến `p-6`; khoảng cách section: `gap-6`
- Container public: `max-w-2xl mx-auto px-4`; admin: `max-w-6xl`

## Components cần style lại

### 1. BalanceCard (public + admin overview)

- Card gradient nhẹ brand (`from-emerald-500 to-emerald-600`) chữ trắng HOẶC card trắng viền với số dư emerald.
- Số dư rất to, kèm label "Số dư quỹ hiện tại".
- Dòng phụ: tổng thu (emerald) / tổng chi (rose) với icon mũi tên.

### 2. Badge trạng thái đóng quỹ

Component `<StatusBadge status>` với 4 trạng thái:

- unpaid → "Chưa đóng" rose
- partial → "Đóng thiếu" amber
- full → "Đủ" emerald
- overpaid → "Dư" emerald (icon khác)
  Dạng pill: nền nhạt + chữ đậm + chấm tròn màu ở đầu.

### 3. MemberStatusList / bảng thu

- Header bảng nền slate-50, chữ uppercase nhỏ, sticky khi scroll.
- Cột tiền canh phải, tabular-nums. Cột "Còn thiếu" tô màu theo trạng thái.
- Hàng hover nền slate-50. Có divider mảnh giữa các hàng.
- Trên mobile (<640px): chuyển mỗi thành viên thành 1 card xếp dọc thay vì bảng.

### 4. QRPaymentModal

- Modal trung tâm, overlay `bg-black/50 backdrop-blur-sm`, card `rounded-2xl`.
- QR nằm trong khung trắng viền, có padding.
- Nút copy số tài khoản + nội dung CK (icon copy, có toast "Đã copy").
- Hiển thị số tiền remaining đậm; nếu remaining <= 0 → badge "Đã đóng đủ" + disable.

### 5. Nút (Button)

- Primary: bg brand, text trắng, `rounded-xl`, `h-10`, hover đậm hơn, focus ring brand.
- Secondary: viền slate-200, nền trắng, hover slate-50.
- Destructive: rose.
- Có trạng thái loading (spinner) và disabled rõ ràng.

### 6. Input / MoneyInput / form

- Input `rounded-xl border-slate-200`, focus ring brand, `h-10`, padding ngang.
- MoneyInput hiển thị `1.000.000 ₫` khi blur.
- Label nhỏ, đậm vừa, đặt phía trên input. Hiển thị lỗi validate màu rose dưới input.

### 7. Admin layout

- Sidebar/topbar gọn với logo "ClassFund" + tabs (Tổng quan / Thành viên & Đợt thu / Ghi thu / Chi tiêu).
- Tab đang active: chữ brand + gạch chân/nền nhạt brand.
- Nút logout góc phải. Hiển thị tổng số dư ở header admin.

### 8. Empty state & Toast

- Empty state: icon Lucide mờ + dòng mô tả + nút hành động (vd "Chưa có thành viên — Import CSV").
- Toast: góc trên phải, có biến thể success (emerald) / error (rose), tự ẩn sau ~3s.

## Phạm vi & ràng buộc

- KHÔNG đổi schema DB, server actions, logic VietQR/auth.
- Giữ nguyên tên route và cấu trúc dữ liệu.
- Chỉ sửa: globals.css (tokens + dark mode), các component UI, layout, className.
- Sau khi sửa: chạy `pnpm run build` và `pnpm run lint` đảm bảo pass, kiểm tra responsive ở 375px và 1280px.

## Kết quả mong đợi

Giao diện sạch, hiện đại, nhất quán 1 màu brand emerald + nền slate trung tính, số tiền nổi bật, trạng thái dùng badge màu semantic, hoạt động đẹp trên mobile, có dark mode.
