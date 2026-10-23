# Hỏi đáp kỹ thuật chuyên sâu (khi giám khảo là người làm CNTT)

> Dùng cùng tệp 07. Mỗi câu trả lời **2–5 câu**, đúng thuật ngữ nhưng dễ nói. ⭐ = hay bị hỏi. **[Trung thực]** = phải nói đúng hiện trạng.

## A. Kiến trúc và công nghệ

**1. ⭐ Mô tả kiến trúc hệ thống.**
Mô hình client–server ba tầng: trình duyệt hoặc PWA (React) → ứng dụng Next.js chạy serverless trên Vercel → PostgreSQL qua bộ gom kết nối; ảnh và tệp ở Cloudinary, thông báo qua Web Push. Giao diện, nghiệp vụ và truy cập dữ liệu dùng chung TypeScript.

**2. ⭐ Vì sao chọn Next.js? Server Component khác gì Client Component?**
Next.js cho định tuyến theo thư mục, render phía máy chủ, caching và Server Actions trong một khung. **Server Component** render trên máy chủ, truy cập CSDL trực tiếp, **không gửi JavaScript xuống trình duyệt** nên nhanh và an toàn; **Client Component** chỉ dùng cho phần tương tác như form, hộp thoại.

**3. Server Action là gì? Có khác API REST không?**
Server Action là hàm chạy trên máy chủ được gọi thẳng từ giao diện, thay cho việc tự viết endpoint REST cho thao tác ghi. Về bản chất vẫn là yêu cầu HTTP POST; Next.js tự xử lý tuần tự hóa và **kiểm tra Origin** để giảm nguy cơ CSRF. Em vẫn **kiểm tra quyền và dữ liệu vào bằng zod** trong từng action như một API.

**4. Vì sao PostgreSQL mà không dùng NoSQL như MongoDB?**
Dữ liệu của Đoàn có **quan hệ chặt** (đoàn viên – Chi đoàn – hoạt động – điểm danh – điểm) và cần **giao dịch ACID** để không lệch điểm. CSDL quan hệ có khóa ngoại, ràng buộc duy nhất và truy vấn tổng hợp (`GROUP BY`) rất hợp cho thi đua và báo cáo.

**5. Prisma ORM giúp gì, có nhược điểm gì?**
Giúp viết truy vấn **an toàn kiểu** (sai tên cột là lỗi ngay khi biên dịch), tự **tham số hóa** chống SQL Injection, và quản lý cấu trúc bảng bằng `schema.prisma`. Nhược điểm: một số truy vấn tổng hợp phức tạp phải viết SQL thô (em dùng template tag tham số hóa), và có thêm một lớp trừu tượng.

**6. Hệ thống triển khai thế nào? CI/CD?**
Mã nguồn lưu trên Git/GitHub. Mỗi lần đẩy mã, Vercel tự **build**, chạy lệnh cập nhật cấu trúc CSDL, khởi tạo dữ liệu cần thiết rồi phát hành. Đó là một dạng **CI/CD** đơn giản.

**7. Serverless là gì? Ưu nhược điểm?**
Mã chạy theo yêu cầu trên hạ tầng của nhà cung cấp, **tự co giãn** và tính tiền theo mức dùng. Nhược điểm: **khởi động lạnh (cold start)** khiến lần đầu chậm, và **mỗi bản sao có pool kết nối riêng** nên dễ vượt giới hạn CSDL, em xử lý bằng pooler và `connection_limit=2`.

**8. PWA khác ứng dụng native thế nào? Hạn chế?**
PWA là web cài được, dùng Service Worker và manifest; **không phải qua cửa hàng**, một mã cho Android và iOS, cập nhật tức thì. Hạn chế: một số khả năng phần cứng hạn chế hơn native; trên iOS cần **thêm vào màn hình chính** mới nhận thông báo đẩy.

## B. Dữ liệu và giao dịch

**9. ⭐ Em thiết kế CSDL thế nào? Có chuẩn hóa không?**
Chuẩn hóa để tránh lặp: `User` (tài khoản) tách `Member` (hồ sơ) nối 1–1; `Department`–`Class`–`Member`; `Activity`–`Attendance`–`PointTransaction`. Có **33 bảng, 33 chỉ mục, 19 ràng buộc duy nhất**. Điểm tổng (`totalPoints`) được **lưu sẵn** (phi chuẩn hóa có kiểm soát) để hiển thị nhanh, và luôn được cập nhật trong cùng giao dịch với bản ghi điểm.

**10. ⭐ Làm sao không cộng điểm hai lần nếu quét QR hai lần cùng lúc?**
Bảng `Attendance` có **ràng buộc duy nhất (hoạt động, đoàn viên)**. Yêu cầu thứ hai sẽ vi phạm ràng buộc, bắt lỗi `P2002` và báo "đã điểm danh". Cơ chế này nằm **ở CSDL** nên an toàn kể cả khi hai yêu cầu chạy song song (tránh **race condition**), không chỉ dựa vào kiểm tra bằng mã.

**11. Giao dịch dùng ở đâu? Giải thích ACID.**
Điểm danh gói 6 bước (ghi điểm danh, ghi điểm, cập nhật tổng điểm và giờ, xét huy hiệu, tạo thông báo, nhật ký) trong **một giao dịch**: **Atomicity** (trọn bộ hoặc hủy hết), **Consistency** (ràng buộc luôn đúng), **Isolation** (các giao dịch không giẫm lên nhau), **Durability** (đã ghi thì bền). Tương tự khi hủy điểm danh và khi chuyển năm học.

**12. Chỉ mục (index) dùng để làm gì? Ví dụ.**
Giống mục lục, tránh quét cả bảng. Ví dụ chỉ mục `(userId, readAt, createdAt)` cho thông báo giúp lấy "thông báo chưa đọc của tôi" nhanh; `(memberId, checkedInAt)` cho lịch sử điểm danh. Đổi lại ghi chậm hơn một chút và tốn chỗ, nên chỉ đặt ở truy vấn thường dùng.

**13. Truy vấn xếp hạng thi đua viết thế nào cho nhanh?**
Dùng **SQL tổng hợp** (`JOIN`, `SUM`, `COUNT`, `GROUP BY`) tính điểm theo Chi đoàn trong khoảng thời gian, thay vì kéo toàn bộ bản ghi về mã rồi cộng. Kết quả công khai được **lưu đệm 5 phút**.

**14. Vấn đề N+1 query là gì, em xử lý ra sao?**
Là lấy danh sách rồi truy vấn từng phần tử. Em dùng tính năng `relationJoins` của Prisma để nạp quan hệ bằng **JOIN trong một truy vấn**, và chạy các truy vấn độc lập **song song** bằng `Promise.all`.

**15. Dữ liệu năm học cũ xử lý thế nào, có ảnh hưởng hiệu năng?**
Điểm danh, điểm được giữ lâu dài, truy vấn lọc theo khoảng thời gian có chỉ mục nên nhanh. Thông báo và nhật ký có **chính sách dọn tự động** (90/120/120 ngày). Ước tính tăng khoảng 55 MB mỗi năm.

**16. Xử lý múi giờ thế nào?**
Lưu **UTC** trong CSDL, **tính và hiển thị theo UTC+7**. Các hàm tính tuần và năm học là hàm thuần, dùng chung giữa máy chủ và trình duyệt nên kết quả nhất quán.

## C. Bảo mật

**17. ⭐ Em lưu mật khẩu thế nào? Vì sao dùng bcrypt?**
Lưu **băm bcrypt có muối**, không lưu mật khẩu thật. bcrypt **chậm có chủ đích** và có hệ số chi phí nên bẻ khóa hàng loạt rất tốn kém; khác với MD5/SHA-1 nhanh nên không phù hợp cho mật khẩu.

**18. ⭐ JWT là gì? Lưu ở đâu? Nếu bị đánh cắp thì sao?**
JWT là token có **chữ ký (HS256)**, chứa mã người dùng và hạn dùng 7 ngày, lưu trong **cookie `HttpOnly`, `SameSite=Lax`, `Secure`**, nên mã JavaScript không đọc được (chống XSS đánh cắp). Mỗi yêu cầu hệ thống **vẫn nạp lại người dùng từ CSDL**, nên khóa tài khoản có hiệu lực ngay. [Trung thực] Token chưa có cơ chế "thu hồi từng phiên"; bù lại có thể **khóa tài khoản** hoặc **đổi khóa bí mật** để hủy toàn bộ phiên.

**19. Các lỗ hổng web phổ biến (OWASP) em phòng thế nào?**
SQL Injection: truy vấn tham số hóa. XSS: React tự escape, bài viết không cho chèn HTML, cookie `HttpOnly`. CSRF: `SameSite` và kiểm tra Origin của Server Actions. Phá quyền/IDOR: kiểm tra phạm vi ở mỗi truy vấn. Brute-force: giới hạn đăng nhập sai. Tải tệp: kiểm tra loại, dung lượng, quyền. (Chi tiết ở mục 8 tệp 07.)

**20. ⭐ IDOR là gì? Ví dụ trong hệ thống?**
Là lỗi cho phép truy cập đối tượng của người khác bằng cách đổi `id` trên đường dẫn. Hệ thống phòng bằng cách **mọi truy vấn theo `id` đều kèm điều kiện phạm vi**: bí thư Chi đoàn A mở URL của Chi đoàn B nhận **404**.

**21. ⭐ Passkey/WebAuthn hoạt động thế nào? Vì sao an toàn hơn mật khẩu?**
Thiết bị tạo **cặp khóa**: khóa riêng nằm trong chip bảo mật (mở bằng vân tay/khuôn mặt), khóa công khai gửi lên máy chủ. Khi đăng nhập, máy chủ gửi **challenge** ngẫu nhiên, thiết bị **ký** bằng khóa riêng, máy chủ xác minh. An toàn hơn vì **không có bí mật dùng chung để lộ**, **chống phishing** (khóa gắn tên miền), **chống phát lại** (challenge một lần, có counter).

**22. Em có lưu dữ liệu sinh trắc học không?**
Không. Vân tay hay khuôn mặt được xử lý trong thiết bị, hệ thống chỉ nhận **chữ ký mật mã**.

**23. Mã QR điểm danh có thể bị làm giả không?**
Không tạo giả được vì token **ký HS256 bằng khóa bí mật** ở máy chủ. Có thể bị **chia sẻ ảnh** nhưng token **chỉ sống 90 giây** và có **nonce đổi được**. [Trung thực] Không chống được hai người đổi điện thoại tại chỗ; hướng bổ sung là kiểm tra vị trí (geofencing) và phát hiện một thiết bị nhiều tài khoản.

**24. Việc phân quyền ở giao diện hay máy chủ?**
**Ở máy chủ**, giao diện chỉ ẩn/hiện nút cho gọn. Mọi Server Action gọi `requireRole`, kiểm tra phạm vi và dữ liệu vào trước khi ghi, nên không thể vượt quyền bằng cách gọi trực tiếp.

**25. Có dùng HTTPS không? Có bảo vệ dữ liệu khi lưu không?**
HTTPS (TLS) do nền tảng cung cấp, bắt buộc để dùng camera quét QR, Service Worker và WebAuthn. Dữ liệu nằm ở dịch vụ CSDL của nhà cung cấp (việc mã hóa lưu trữ ở mức hạ tầng do nhà cung cấp quy định, nên nói "theo chính sách của nhà cung cấp", đừng khẳng định cụ thể nếu chưa kiểm tra); mật khẩu thì được băm riêng. [Trung thực] Em không tự mã hóa thêm từng trường dữ liệu cá nhân.

**26. Đã kiểm thử bảo mật chưa?**
[Trung thực] Em tự rà theo danh sách lỗ hổng phổ biến và thử các tình huống vượt quyền (ví dụ bí thư vào lớp khác, đoàn viên gọi chức năng quản trị, thu hồi tài khoản có hiệu lực ngay). Em **chưa thuê kiểm thử xâm nhập độc lập** và chưa cấu hình tiêu đề bảo mật nâng cao như CSP.

## D. Hiệu năng và vận hành

**27. ⭐ Hệ thống chịu được bao nhiêu người dùng?**
Thiết kế cho khoảng 1.400 người. Trang công khai lưu đệm; điểm danh là giao dịch ngắn; kết nối CSDL qua **pooler**. Cao điểm điểm danh cả trường ước 5–50 yêu cầu mỗi giây trong vài phút, nằm trong khả năng kiến trúc. [Trung thực] Đây là **ước tính**, chưa thử tải thật; em dự định dùng công cụ như k6 để đo.

**28. Điểm nghẽn có thể ở đâu?**
Ở **cơ sở dữ liệu** (số kết nối và dung lượng), không phải tầng ứng dụng vì serverless tự nhân bản. Xử lý bằng pooler, giới hạn kết nối mỗi bản sao, chia nhỏ khung giờ điểm danh, và nâng gói khi cần.

**29. Nếu 1.400 bạn quét cùng một giây?**
Các yêu cầu được xếp hàng ở pooler và xử lý song song theo giới hạn; người dùng có thể thấy chậm vài giây chứ không mất dữ liệu nhờ ràng buộc và giao dịch. Cách tốt hơn là **chia đợt điểm danh theo khối/Chi đoàn**.

**30. Lưu đệm (cache) có làm dữ liệu sai lệch không?**
Có độ trễ có chủ đích: trang chủ tối đa **60 giây**, bảng thi đua công khai **5 phút**. Các trang quản lý và điểm danh **không dùng cache dài** nên luôn mới.

**31. Giám sát và xử lý lỗi thế nào?**
Mọi Server Action bọc bởi một hàm **chuẩn hóa lỗi**: lỗi nghiệp vụ trả thông báo tiếng Việt, lỗi hệ thống trả thông báo chung và ghi log nội bộ. [Trung thực] Chưa có hệ thống giám sát tập trung (như Sentry); đây là việc nên bổ sung.

**32. Cập nhật cấu trúc CSDL như thế nào? Có rủi ro mất dữ liệu?**
Hiện dùng `prisma db push`, an toàn với thay đổi thêm bảng/cột; khi có thay đổi nguy hiểm công cụ cảnh báo. [Trung thực] Khi vận hành thật nên chuyển sang **migration có phiên bản** và có quy trình sao lưu trước khi đổi cấu trúc.

**33. Idempotent là gì, hệ thống có không?**
Làm lặp lại nhiều lần cho cùng kết quả. Các tác vụ hằng ngày (nhắc lịch, chuyển năm học, dọn dữ liệu) **chạy lại không gây hại**; nhắc lịch dùng cập nhật có điều kiện để **không gửi trùng** kể cả khi hai lần chạy chồng nhau.

## E. Chất lượng phần mềm

**34. ⭐ Em kiểm thử thế nào? Có test tự động không?**
[Trung thực] Em dùng **TypeScript để kiểm tra kiểu toàn dự án** trước mỗi lần đẩy mã và **kiểm thử tay có kịch bản** trên trình duyệt (cả giao diện điện thoại, giả lập mạng chậm, thiết bị xác thực giả cho passkey). Em **chưa có bộ test tự động** (unit/E2E); đây là công việc tiếp theo.

**35. Cấu trúc mã nguồn tổ chức thế nào?**
Phân lớp: `app/` (trang), `actions/` (nghiệp vụ ghi dữ liệu), `lib/services/` (truy vấn, nghiệp vụ dùng chung), `lib/` (xác thực, phân quyền, thời gian, thông báo), `components/` (giao diện tái sử dụng). Quy tắc nghiệp vụ như tính điểm, xếp hạng, tính tuần nằm ở **hàm riêng, dễ kiểm chứng**.

**36. Có nợ kỹ thuật (technical debt) không?**
Có và em đã ghi nhận: chưa có test tự động, chưa dùng migration có phiên bản, giới hạn đăng nhập sai lưu trong bộ nhớ, chưa có giám sát tập trung. Em xếp ưu tiên: test tự động và thử tải trước, rồi migration và Redis.

**37. Nếu phải làm lại, em thay đổi gì?**
Viết **test tự động ngay từ đầu** cho phần điểm danh và thi đua, dùng **migration có phiên bản**, và thiết kế sẵn **chế độ ngoại tuyến** cho điểm danh.

## F. Câu hỏi "thử kiến thức"

**38. HTTP khác HTTPS thế nào?** HTTPS là HTTP chạy trên **TLS**: mã hóa, xác thực máy chủ và chống bị sửa dữ liệu trên đường truyền.

**39. GET khác POST?** GET lấy dữ liệu (nên không đổi trạng thái); POST gửi dữ liệu để thay đổi. Server Actions dùng POST.

**40. Cookie và localStorage khác gì? Vì sao chọn cookie?** Cookie tự đính kèm yêu cầu và có cờ `HttpOnly` cho phép **JavaScript không đọc được**; localStorage thì mã JavaScript đọc được nên dễ bị XSS lấy cắp. Vì vậy phiên đăng nhập lưu trong cookie.

**41. Mã hóa khác băm thế nào?** Mã hóa **có thể giải ngược** (có khóa); băm là **một chiều**. Mật khẩu dùng băm vì không cần (và không nên) khôi phục.

**42. Khóa công khai/khóa riêng là gì?** Cặp khóa liên hệ: **khóa riêng ký, khóa công khai kiểm tra chữ ký**. Biết khóa công khai không suy ra được khóa riêng. Passkey dùng nguyên lý này.

**43. Race condition là gì?** Kết quả sai do nhiều thao tác chạy song song giẫm lên nhau (ví dụ cộng điểm hai lần). Phòng bằng **ràng buộc ở CSDL** và **giao dịch**.

**44. CDN là gì, hệ thống có dùng không?** Mạng phân phối nội dung đặt máy chủ gần người dùng để tải ảnh/tệp nhanh. Cloudinary và Vercel dùng CDN nên ảnh và tệp tĩnh tải nhanh.

**45. Responsive là gì?** Giao diện **tự thích nghi** với kích thước màn hình; hệ thống dùng bảng trên máy tính và danh sách gọn trên điện thoại.

**46. SSR khác CSR thế nào?** SSR dựng HTML trên máy chủ (tải nhanh, thân thiện tìm kiếm); CSR dựng ở trình duyệt bằng JavaScript. Next.js kết hợp cả hai (Server và Client Components).

**47. API là gì?** Giao thức cho hai phần mềm nói chuyện với nhau. Hệ thống dùng Server Actions cho thao tác ghi và vài điểm cuối API cho tải tệp, xuất Excel, thông báo đẩy, tác vụ định kỳ.

**48. Mã nguồn mở / giấy phép?** Các thư viện chính (React, Next.js, Prisma, Tailwind...) là **mã nguồn mở**; sử dụng đúng giấy phép cho phép dùng trong dự án giáo dục.
