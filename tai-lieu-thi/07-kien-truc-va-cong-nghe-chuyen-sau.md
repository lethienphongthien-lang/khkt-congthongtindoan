# Kiến trúc và công nghệ chuyên sâu (kiến thức CNTT)

> **Dành cho:** thí sinh đã nắm tệp 02 (ví dụ đời thường) và muốn **hiểu đúng bản chất kỹ thuật** để trả lời giám khảo có chuyên môn CNTT.
> Mỗi mục có: **bản chất kỹ thuật → hệ thống của mình làm thế nào → vì sao chọn → thuật ngữ nên dùng**.
> Số phiên bản lấy từ tệp cấu hình dự án: Next.js 16, React 19, Prisma 6, Tailwind CSS 4, TypeScript.

---

## 1. Tổng quan kiến trúc

**Mô hình:** ứng dụng web nhiều tầng (**3-tier**) theo **client–server**, triển khai kiểu **serverless** trên đám mây.

```
┌─────────────────────────┐   HTTPS    ┌──────────────────────────────┐        ┌────────────────────┐
│  TẦNG TRÌNH BÀY (Client)│ ─────────▶ │  TẦNG ỨNG DỤNG (Vercel)      │ ─────▶ │ TẦNG DỮ LIỆU        │
│  Trình duyệt / PWA      │            │  Next.js: render + Server    │  SQL   │ PostgreSQL (Prisma  │
│  React 19, Tailwind CSS │ ◀───────── │  Actions + API routes + cron │ ◀───── │ Postgres) qua pooler│
│  Service Worker, WebAuthn│  HTML/JSON │  Prisma ORM, zod, jose       │        └────────────────────┘
└─────────────────────────┘            └──────────────┬───────────────┘        ┌────────────────────┐
                                                      └──────────────────────▶ │ Cloudinary (ảnh/tệp)│
                                                         Web Push (VAPID)      └────────────────────┘
```

**Vì sao chọn kiến trúc này:**
- **Một mã nguồn, một ngôn ngữ (TypeScript)** cho cả giao diện và máy chủ → ít lỗi do lệch kiểu dữ liệu, dễ bảo trì.
- **Serverless**: tự co giãn theo số người truy cập, không phải quản trị máy chủ, trả tiền theo mức dùng (gói nhỏ gần như miễn phí).
- **PostgreSQL** (cơ sở dữ liệu quan hệ) phù hợp dữ liệu có **quan hệ chặt** (đoàn viên – Chi đoàn – hoạt động – điểm danh) và cần **giao dịch ACID**.

---

## 2. Vòng đời một yêu cầu (request lifecycle)

Ví dụ: đoàn viên mở trang **Hoạt động**.

1. Trình duyệt gửi `GET /activities` kèm **cookie phiên** (`doan_session`).
2. **`proxy.ts`** (lớp chặn đầu, tương đương middleware của Next.js) kiểm tra nhanh: không có cookie và không phải đường dẫn công khai → chuyển về `/login`. *Đây chỉ là lớp chặn nhanh, không phải bảo mật chính.*
3. Next.js chạy **Server Component** của trang: gọi `requireUser()` → **giải mã JWT** (kiểm tra chữ ký, hạn dùng) → **nạp người dùng từ cơ sở dữ liệu** (để khóa tài khoản có hiệu lực ngay).
4. Trang truy vấn dữ liệu qua **Prisma** với **phạm vi quyền** (`activityScope(user)`): đoàn viên chỉ thấy hoạt động của Chi đoàn mình + toàn trường.
5. Server render ra **HTML** (kèm dữ liệu) gửi về; trình duyệt "**hydrate**" để các nút bấm hoạt động.
6. Khi người dùng bấm "Đăng ký", trình duyệt gọi một **Server Action** (`registerActivityAction`) → máy chủ kiểm tra lại quyền, kiểm tra điều kiện nghiệp vụ, ghi cơ sở dữ liệu, trả kết quả.

**Điểm cần nhấn mạnh:** quyền được kiểm tra **lại ở bước 3 và bước 6 (phía máy chủ)**, không tin vào giao diện.

---

## 3. Giao diện: React, Next.js, Tailwind

- **React 19:** thư viện giao diện theo **component** (mảnh giao diện tái sử dụng) và **trạng thái (state)**; khi dữ liệu đổi thì giao diện tự cập nhật (cơ chế **Virtual DOM / reconciliation**).
- **Next.js 16 (App Router):** khung (framework) trên React, cung cấp:
  - **Định tuyến theo thư mục** (`src/app/...` → URL), **route group** `(public)`, `(dashboard)`, `(auth)` tách giao diện công khai/quản lý/đăng nhập.
  - **Server Components (RSC)** mặc định: render **trên máy chủ**, gửi HTML, **không gửi mã JavaScript** của phần đó xuống trình duyệt → tải nhanh, truy cập cơ sở dữ liệu trực tiếp, an toàn (khóa bí mật không lộ).
  - **Client Components** (`"use client"`) cho phần tương tác (form, hộp thoại, bộ chọn tuần).
  - **Server Actions:** hàm chạy trên máy chủ, gọi trực tiếp từ giao diện, **thay cho tự viết API REST** cho thao tác ghi. Next.js tự kiểm tra nguồn gốc yêu cầu (**Origin**) để giảm nguy cơ **CSRF**.
  - **`loading.tsx` + Suspense:** hiện **khung chờ (skeleton)** trong lúc máy chủ chuẩn bị dữ liệu (**streaming**).
  - **Caching/ISR:** trang công khai dùng `revalidate = 60` (làm mới tối đa mỗi 60 giây); bảng thi đua công khai dùng `unstable_cache` 300 giây.
- **Tailwind CSS 4:** CSS dạng **tiện ích (utility-first)**, đặt kiểu ngay trong thẻ; có biến thiết kế (design token) như màu xanh Đoàn `#0b63b8`; **responsive** bằng tiền tố `sm:`, `lg:`.
- **Thiết kế đáp ứng (responsive):** bảng trên máy tính, **danh sách gọn một dòng** trên điện thoại; bố cục thanh điều hướng dưới (bottom navigation).

**Thuật ngữ nên dùng:** SSR/RSC, hydrate, streaming, Server Actions, component, responsive, utility-first CSS.

---

## 4. Cơ sở dữ liệu quan hệ và Prisma ORM

### 4.1 PostgreSQL
- **CSDL quan hệ** (RDBMS): dữ liệu trong **bảng**, liên kết bằng **khóa ngoại (foreign key)**.
- **33 bảng, 10 kiểu liệt kê (enum), 33 chỉ mục (index), 19 ràng buộc duy nhất (unique)**.
- **Chuẩn hóa:** tránh lặp dữ liệu; ví dụ `Member` (hồ sơ) tách khỏi `User` (tài khoản), nối **1–1**.

### 4.2 Sơ đồ quan hệ chính (ER rút gọn)

```
User 1───1 Member ──N── Attendance ──N──1 Activity ──N──1 ActivityCategory
  │            │              │                │
  │            │              └─ 1──1 PointTransaction (điểm sinh ra từ điểm danh)
  │            ├──N── ActivityRegistration ──N──1 Activity
  │            ├──N── MemberBadge ──N──1 Badge
  │            └──N──1 Class ──N──1 Department (Chi đoàn)
  │
  └─ (bí thư) Department.secretaryId  → một tài khoản là bí thư của tối đa một Chi đoàn
Department 1──N Activity | EmulationRecord | ChapterReport | Post
Article 1──N ArticleAttachment        Poll 1──N PollOption 1──N PollVote
```

**Quan hệ đáng chú ý:**
- **Attendance ↔ PointTransaction 1–1**: mỗi lượt điểm danh sinh đúng một bút toán điểm → **truy vết** được điểm đến từ đâu.
- **Ràng buộc duy nhất `(activityId, memberId)`** trên `Attendance`: **CSDL tự chặn điểm danh trùng**, kể cả khi hai yêu cầu đến cùng lúc (**tránh race condition**).
- **Ràng buộc duy nhất `(name, startYear)`** ở `Department`: cho phép hai Chi đoàn cùng tên khác khóa.

### 4.3 Chỉ mục (index)
Chỉ mục giống **mục lục sách**, giúp tìm nhanh không phải quét cả bảng. Ví dụ: `Notification(userId, readAt, createdAt)` giúp lấy "thông báo chưa đọc của tôi" tức thì; `Attendance(memberId, checkedInAt)` cho lịch sử cá nhân.

### 4.4 Prisma ORM
- **ORM (Object–Relational Mapping):** viết truy vấn bằng đối tượng TypeScript thay vì SQL thuần; Prisma sinh **kiểu dữ liệu** từ `schema.prisma` nên **sai tên cột là lỗi ngay khi biên dịch**.
- **Chống SQL Injection:** Prisma dùng **truy vấn tham số hóa (prepared/parameterized)**; với SQL thô, hệ thống dùng **template tag** (`$queryRaw`) cũng tham số hóa, **không nối chuỗi**.
- `relationJoins`: nạp dữ liệu liên quan bằng **JOIN trong một truy vấn** thay vì nhiều truy vấn (giảm "N+1 queries").
- **Tính toán tổng hợp bằng SQL** (`GROUP BY`, `SUM`, `COUNT`) cho bảng xếp hạng thi đua thay vì kéo hết dữ liệu về xử lý bằng mã.
- **Cập nhật cấu trúc:** `prisma db push` (đồng bộ schema); hạn chế: **chưa dùng migration có phiên bản** (xem mục hạn chế).

### 4.5 Giao dịch ACID
Điểm danh là **một giao dịch** (`prisma.$transaction`): ghi `Attendance` → ghi `PointTransaction` → tăng `totalPoints`, `volunteerMinutes` → xét huy hiệu → tạo thông báo → ghi nhật ký. **Atomicity:** lỗi bước nào thì **rollback tất cả**. **Isolation + ràng buộc unique** bảo đảm hai yêu cầu song song không cộng điểm hai lần (bắt lỗi `P2002` → báo "đã điểm danh rồi").

---

## 5. Xác thực (authentication) và phiên đăng nhập

### 5.1 Mật khẩu
- Lưu **băm bằng bcrypt** (hàm băm **có muối (salt)** và **chậm có chủ đích**, chống dò mật khẩu hàng loạt). Không lưu mật khẩu thật; không giải ngược được.
- Chính sách: tối thiểu 8 ký tự, có chữ và số; khác mật khẩu cũ; mật khẩu tạm 10 ký tự ngẫu nhiên (sinh bằng **bộ sinh số ngẫu nhiên an toàn mật mã** `crypto.randomInt`), **bắt buộc đổi** ở lần đầu.
- **Chống dò (brute-force):** giới hạn 8 lần sai / 15 phút theo cặp tên đăng nhập + địa chỉ IP; **luôn so sánh băm** cả khi không có tài khoản để **giảm lộ thông tin qua thời gian phản hồi (timing)**; thông báo lỗi chung.

### 5.2 Phiên bằng JWT
- Sau đăng nhập, máy chủ cấp **JWT** (JSON Web Token) ký **HS256 (HMAC-SHA256)** bằng khóa bí mật `AUTH_SECRET`, hạn **7 ngày**, lưu trong **cookie**:
  - `HttpOnly`: JavaScript không đọc được → chống **đánh cắp bằng XSS**.
  - `SameSite=Lax`: hạn chế gửi cookie từ trang khác → chống **CSRF**.
  - `Secure` (khi chạy thật): chỉ gửi qua HTTPS.
- **Không tin hoàn toàn JWT:** mỗi yêu cầu vẫn **nạp lại người dùng từ CSDL** để biết tài khoản còn hoạt động và đúng vai trò → khóa/thu hồi có hiệu lực **ngay**, không chờ token hết hạn.
- Thư viện: `jose` (chuẩn, kiểm tra chữ ký và hạn).

### 5.3 Passkey / WebAuthn (FIDO2)
- **Mật mã khóa công khai (bất đối xứng):** thiết bị tạo **cặp khóa**; **khóa riêng** nằm trong chip bảo mật của điện thoại (mở bằng vân tay/khuôn mặt), **khóa công khai** gửi lên máy chủ.
- **Đăng ký:** máy chủ sinh `challenge` ngẫu nhiên → thiết bị ký → máy chủ xác minh và lưu khóa công khai + `counter`.
- **Đăng nhập:** máy chủ gửi `challenge` mới → thiết bị **ký bằng khóa riêng** → máy chủ xác minh bằng khóa công khai. **Chống phát lại (replay)** nhờ `challenge` dùng một lần (lưu trong cookie ký số hạn 5 phút) và `counter`.
- **Chống lừa đảo (phishing):** khóa **gắn với tên miền** (`rpID`), trang giả mạo không dùng được.
- **Dữ liệu sinh trắc học không rời thiết bị.** Thư viện: `@simplewebauthn`.

---

## 6. Phân quyền (authorization)

- **RBAC (Role-Based Access Control):** vai trò `ADMIN`, `SECRETARY`, `MEMBER`; thêm cờ `superAdmin` để tách **Quản trị hệ thống** và **Ban chấp hành**.
- **Kiểm tra quyền tại máy chủ ở mọi Server Action và mọi truy vấn** (`requireRole`, `canManageDepartment`, `activityScope`, `memberScope`).
- **Phòng IDOR** (Insecure Direct Object Reference): mỗi thao tác theo `id` đều **kiểm tra đối tượng đó có thuộc phạm vi của người dùng không**. Ví dụ bí thư Chi đoàn A gõ URL của Chi đoàn B nhận **404**, không phải 403 (không lộ sự tồn tại).
- **Nguyên tắc đặc quyền tối thiểu:** bí thư chỉ lưu bài nháp (máy chủ **ép** `published=false`), việc cấp/thu hồi tài khoản Ban chấp hành chỉ Quản trị hệ thống.

---

## 7. Mã QR điểm danh (thiết kế an toàn)

- Token là **JWT ký HS256**, nội dung: `aid` (mã hoạt động), `n` (nonce), `typ=checkin`, **hạn 90 giây**.
- **Nonce theo hoạt động** lưu trong cơ sở dữ liệu; bấm "Tạo QR mới" hoặc đóng/mở **đổi nonce → mọi token cũ vô hiệu** dù chưa hết 90 giây.
- **Quét QR không tự điểm danh**: mở trang xác nhận, người dùng **bấm xác nhận** (tránh việc trình duyệt/ứng dụng **tải trước liên kết** tự gây điểm danh).
- Máy chủ kiểm tra: chữ ký, hạn, nonce, hoạt động chưa hủy, `checkinOpen`, khung giờ, đoàn viên còn sinh hoạt, đúng Chi đoàn, chưa điểm danh.
- **Điểm không do máy khách gửi**: lấy từ `Activity.points` trong CSDL.
- **Ghi vết:** thiết bị (user-agent), địa chỉ IP, thời điểm, phương thức (QR/MANUAL), người điểm danh hộ.

**Giới hạn thiết kế:** QR bảo vệ khỏi **chia sẻ ảnh**, nhưng không ngăn "hai người đổi điện thoại cho nhau tại chỗ" → hướng bổ sung: **geofencing**, phát hiện **một thiết bị nhiều tài khoản**.

---

## 8. Kiểm tra dữ liệu đầu vào và chống tấn công web

| Mối đe dọa | Cách phòng trong hệ thống |
|---|---|
| **SQL Injection** | Prisma tham số hóa; SQL thô dùng template tag |
| **XSS** (chèn mã vào trang) | React **tự escape** nội dung; nội dung bài viết hiển thị bằng bộ định dạng riêng (`RichText`) không cho chèn HTML; cookie phiên `HttpOnly` |
| **CSRF** | Cookie `SameSite=Lax` + Server Actions kiểm tra Origin |
| **IDOR / phá quyền** | Kiểm tra phạm vi ở mỗi truy vấn (mục 6) |
| **Brute-force** | Giới hạn đăng nhập sai, bcrypt chậm, so sánh băm không đổi thời gian |
| **Tải tệp độc hại** | Chỉ nhận định dạng và dung lượng cho phép, kiểm tra thư mục lưu hợp lệ, chỉ Admin tải tài liệu; tệp lưu ở **Cloudinary**, không chạy trên máy chủ |
| **Spam (góp ý ẩn danh)** | Ô bẫy (honeypot), giới hạn 30 góp ý/giờ |
| **Lộ khóa bí mật** | Chỉ ở biến môi trường máy chủ; Server Components không gửi xuống trình duyệt |
- **Kiểm tra bằng zod** ở máy chủ cho mọi biểu mẫu (độ dài, kiểu, định dạng); lỗi trả về tiếng Việt.
- **Hàm bọc chuẩn hóa lỗi:** lỗi nghiệp vụ trả thông báo thân thiện, **lỗi hệ thống không lộ chi tiết nội bộ** (chỉ ghi log).

---

## 9. Thông báo đẩy và PWA

- **PWA** gồm: **Web App Manifest** (tên, biểu tượng, màu nền, `start_url`, chế độ `standalone`), **Service Worker** (`sw.js`) chạy nền, **HTTPS**.
- **Web Push (giao thức chuẩn):**
  1. Trình duyệt đăng ký với dịch vụ đẩy của hãng (Google/Apple/Mozilla) → được một **subscription** (endpoint + khóa).
  2. Máy chủ lưu subscription (`PushSubscription`).
  3. Khi có sự kiện, máy chủ gửi thông báo **đã mã hóa** tới endpoint, **ký bằng khóa VAPID**.
  4. **Service Worker** nhận sự kiện `push`, hiển thị thông báo kể cả khi đã đóng ứng dụng.
- Gửi **sau khi phản hồi đã trả** (`after()`) để không làm chậm thao tác của người dùng.
- **Trang khởi động tĩnh** (`start.html`) được Service Worker **lưu sẵn trong bộ nhớ đệm** (chiến lược **stale-while-revalidate**) để mở ứng dụng không bị màn hình trống.

---

## 10. Hiệu năng và khả năng mở rộng

- **Lưu đệm (caching):** trang công khai làm mới 60 giây; bảng xếp hạng công khai 300 giây; ảnh banner **dựng sẵn thành WebP** (giảm vẽ lại khi cuộn).
- **Tối ưu truy vấn:** chỉ mục, JOIN thay vì N+1, **tổng hợp trong SQL**, truy vấn song song (`Promise.all`), chỉ nạp dữ liệu của **tab đang mở** (Cài đặt).
- **Kết nối CSDL:** mỗi bản sao serverless có **pool riêng**, dễ vượt giới hạn kết nối → dùng **bộ gom kết nối (connection pooler)** + giới hạn `connection_limit=2`/bản sao.
- **Tránh "kẹt" khi quá tải:** các việc nặng chạy nền (thông báo đẩy), điểm danh là giao dịch ngắn.
- **Lazy / Streaming + skeleton**: giao diện hiện sớm.
- **Ước tính tải điểm danh:** 1.400 lượt trong vài phút ≈ 5–50 yêu cầu/giây, nằm trong khả năng của kiến trúc (chưa thử tải thật).
- **Co giãn:** serverless tự thêm bản sao; điểm nghẽn là **CSDL** (kết nối và dung lượng), xử lý bằng pooler và nâng gói.

---

## 11. Xử lý thời gian (một điểm kỹ thuật tinh tế)

- Mọi mốc thời gian lưu **UTC** trong CSDL; hiển thị và tính theo **múi giờ Việt Nam (UTC+7)**.
- **Năm học** bắt đầu 01/09 theo giờ Việt Nam; **tuần** tính từ ngày Tuần 1 do Admin đặt, mỗi tuần 7 ngày; các hàm tính khoảng thời gian là **hàm thuần (pure function)** nên dễ kiểm chứng.
- Trình duyệt hiển thị ngày giờ theo múi giờ Asia/Ho_Chi_Minh để **không lệch** khi người dùng ở múi giờ khác.

---

## 12. Tác vụ định kỳ (cron) và tính lũy đẳng

- **Vercel Cron** gọi 3 đường dẫn mỗi ngày: nhắc lịch, chuyển năm học, dọn dữ liệu; **bảo vệ bằng `CRON_SECRET`** (header `Authorization: Bearer`).
- Thiết kế **lũy đẳng (idempotent):** chạy lại nhiều lần **không gây hại** (ví dụ nhắc lịch đánh dấu `reminderSentAt` trước khi gửi bằng cập nhật có điều kiện để **không gửi trùng** nếu hai lần chạy chồng nhau).

---

## 13. Chất lượng mã và quy trình

- **TypeScript** (kiểu tĩnh) + **`tsc --noEmit`** kiểm tra kiểu toàn dự án trước mỗi lần đẩy mã.
- **Phân lớp rõ:** `app/` (trang), `actions/` (xử lý nghiệp vụ ghi), `lib/services/` (truy vấn và nghiệp vụ dùng chung), `lib/` (xác thực, phân quyền, thời gian, thông báo), `components/` (giao diện tái sử dụng).
- **Quản lý mã nguồn:** Git, lịch sử commit rõ ràng, lưu trên GitHub; **triển khai liên tục (CI/CD)**: đẩy mã → Vercel tự build → tự cập nhật CSDL → phát hành.
- **Tài liệu:** `README.md`, `MO-TA-HE-THONG.md` ghi lại nghiệp vụ và cấu hình.

---

## 14. Hạn chế kỹ thuật (nên tự nói trước)

1. **Chưa có bộ kiểm thử tự động** (unit/integration/E2E); mới kiểm tra kiểu bằng TypeScript và kiểm thử tay các tình huống chính.
2. **Giới hạn đăng nhập sai lưu trong bộ nhớ** từng bản sao → với nhiều bản sao, giới hạn **không đồng bộ** (cần Redis/Upstash nếu mở rộng lớn).
3. **Chưa dùng migration có phiên bản** (đang `db push`) → khi vận hành thật nên chuyển sang `prisma migrate`.
4. **Chưa cấu hình các tiêu đề bảo mật nâng cao** (như Content-Security-Policy) và **chưa kiểm thử xâm nhập độc lập**.
5. **Điểm danh cần mạng**; chưa có chế độ ngoại tuyến (offline queue).
6. **Chưa có sao lưu/xuất toàn bộ dữ liệu tự động**; dựa vào sao lưu của nhà cung cấp.
7. **Chưa thử tải thật** quy mô 1.400 người đồng thời.
8. **Chưa có email** → quên mật khẩu phải nhờ Admin.
9. **Dữ liệu đặt ở máy chủ nước ngoài** (khu vực Singapore).

**Cách nói:** "Đây là những giới hạn em đã nhận diện; đồng thời em có lộ trình khắc phục như dùng Redis, migration, kiểm thử tự động và thử tải."

---

## 15. Bảng tra nhanh: "công nghệ nào giải quyết vấn đề nào?"

| Vấn đề | Công nghệ / kỹ thuật |
|---|---|
| Giao diện tương tác, dùng lại | React component |
| Trang tải nhanh, thân thiện tìm kiếm | Next.js SSR/RSC + caching |
| Không phải viết API riêng | Server Actions |
| Dữ liệu có quan hệ, cần toàn vẹn | PostgreSQL + khóa ngoại + unique |
| Viết truy vấn an toàn, có kiểu | Prisma ORM |
| Không cộng điểm sai/trùng | Giao dịch ACID + ràng buộc unique |
| Lưu mật khẩu an toàn | bcrypt (băm + muối) |
| Duy trì đăng nhập | JWT (HS256) trong cookie HttpOnly |
| Đăng nhập không mật khẩu | WebAuthn / passkey |
| Chống điểm danh qua ảnh chụp | JWT ngắn hạn 90 giây + nonce |
| Kiểm tra dữ liệu vào | zod |
| Phân quyền theo Chi đoàn | RBAC + phạm vi truy vấn |
| Thông báo tới điện thoại | Web Push + Service Worker + VAPID |
| Dùng như ứng dụng | PWA (manifest + Service Worker) |
| Nhiều người cùng lúc | Serverless + connection pooler |
| Tác vụ hằng ngày | Vercel Cron + lũy đẳng |
| Lưu ảnh, tệp | Cloudinary (object storage/CDN) |
| Truy vết trách nhiệm | Nhật ký thao tác (audit log) |
