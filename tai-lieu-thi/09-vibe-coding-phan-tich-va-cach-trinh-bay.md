# Phân tích dự án theo góc nhìn "Vibe coding": em có ý tưởng, AI viết mã

> **Dành cho:** thí sinh trực tiếp ra yêu cầu và để AI viết mã, muốn **trình bày trung thực, tự tin và chứng minh được đóng góp của mình**.
> **Thông điệp cốt lõi:** *Vibe coding không có nghĩa là "AI làm hộ". Giá trị của em nằm ở **bài toán, quyết định, kiểm thử và trách nhiệm**; AI là **công cụ viết mã tốc độ cao**.*

---

## 1. "Vibe coding" là gì (nói được trong 20 giây)

> "Vibe coding là cách làm phần mềm mà người làm **mô tả bằng ngôn ngữ tự nhiên điều mình muốn**, để AI sinh mã, rồi **người dùng thử, nhận xét và yêu cầu chỉnh lại** cho đến khi đúng. Người làm tập trung vào **bài toán và trải nghiệm**, ít phải gõ từng dòng mã."

**Hai kiểu vibe coding cần phân biệt (rất quan trọng khi trình bày):**

| | Vibe coding "thả trôi" | Vibe coding **có kiểm soát** (dự án này) |
|---|---|---|
| Cách làm | Gõ yêu cầu, chấp nhận mọi thứ AI trả về, không đọc kết quả | Ra yêu cầu rõ, **chạy thử, xem từng màn hình, phản hồi cụ thể**, chọn phương án |
| Quyết định thiết kế | Để AI tự quyết | **Người làm quyết định** (nghiệp vụ, phân quyền, giao diện) |
| Kiểm tra | Hầu như không | Kiểm thử tay theo kịch bản, kiểm tra kiểu (TypeScript), sửa lỗi phát hiện được |
| Hiểu sản phẩm | Thấp | Cần **hiểu nguyên lý** để giải thích (tệp 02, 07) |

> Dự án của em thuộc nhóm **"có kiểm soát"**: em có ý tưởng và nghiệp vụ, chỉ đạo từng bước, kiểm tra kết quả bằng mắt trên máy tính lẫn điện thoại, và quyết định đổi hướng nhiều lần. **Đó là điều nên nhấn mạnh.**

---

## 2. Dự án này được làm như thế nào (quy trình thật, dùng để kể)

**Vòng lặp lặp đi lặp lại hàng trăm lần:**

```
Em nêu nhu cầu / ý tưởng  ─▶  AI đề xuất và viết mã  ─▶  Em chạy thử, nhìn màn hình
        ▲                                                         │
        └──────────  Em nhận xét ("chưa đẹp", "bị lỗi", "đổi thành…")  ◀──┘
```

**Số liệu chứng minh quá trình (có thể mang theo làm bằng chứng):**
- **83+ lần commit** trong Git: mỗi lần là một bước cải tiến có ghi mô tả.
- Hơn **11.000 dòng mã**, **61 trang**, **33 bảng** dữ liệu hình thành qua nhiều vòng phản hồi.
- Còn **toàn bộ lịch sử trao đổi** giữa em và AI (nhật ký hội thoại) cho thấy yêu cầu của em, các lần em chê, đổi ý, chọn hướng.

> 💡 **Lưu giữ bằng chứng:** sao lưu **lịch sử Git** và **nhật ký hội thoại** của quá trình làm. Giám khảo hỏi "em đóng góp gì" thì đây là bằng chứng mạnh nhất.

---

## 3. Phần việc của NGƯỜI và phần việc của AI

| Việc | Ai làm | Ghi chú |
|---|---|---|
| Phát hiện vấn đề thực tế của Đoàn trường | **Em** | điểm danh giấy, thi đua tính tay, thông tin rải rác |
| Đặt yêu cầu, chọn chức năng | **Em** | em quyết định làm gì và **không làm gì** |
| Quy tắc nghiệp vụ (cách tính thi đua, phân quyền, quy trình duyệt bài, lịch tuần, năm học) | **Em** | em hiểu hoạt động Đoàn, AI không biết |
| Thiết kế giao diện, bố cục, màu sắc, tên gọi | **Em** (chỉ đạo) + AI (thực hiện) | em phản hồi theo ảnh chụp màn hình |
| Viết mã, tạo bảng dữ liệu, xử lý lỗi | **AI** | theo yêu cầu của em |
| Chạy thử, phát hiện lỗi và điều bất hợp lý | **Em** | điện thoại thật, nhiều kích thước màn hình |
| Chọn hướng khi có nhiều phương án | **Em** | AI đưa phương án, em chọn |
| Kiểm tra an toàn (kiểu dữ liệu, thử kịch bản) | **Em + AI** | AI chạy kiểm tra, em duyệt kết quả |
| Triển khai lên mạng, cấu hình dịch vụ | **Em + AI** | em tạo tài khoản, đặt khóa bí mật |
| Chịu trách nhiệm về sản phẩm | **Em** | |

---

## 4. Những quyết định của NGƯỜI làm (chứng minh em không "thả trôi")

Đây là những lần em **chủ động đổi hướng hoặc quyết định**, nên **học thuộc vài ví dụ** để kể khi bị hỏi:

**Về nghiệp vụ**
1. *"Bí thư không phải tài khoản riêng mà là một đoàn viên mang vai trò bí thư"* → em sửa lại thiết kế phân quyền, vì đúng với thực tế tổ chức Đoàn. (AI ban đầu làm bí thư là tài khoản riêng.)
2. *Có nhiều Admin: Bí thư và Phó Bí thư Đoàn trường được cấp tài khoản, Quản trị hệ thống mới cấp/thu hồi* → em đặt ra **hai cấp quản trị**.
3. *Chi đoàn có niên khóa, tự đổi 10A1→11A1→12A1, hết lớp 12 khóa tài khoản* → em xác định bài toán "lớp lên mỗi năm".
4. *Giáo dục tính theo **tuần**, Tuần 1 của năm học 2026–2027 bắt đầu 05/09* → em yêu cầu **làm lại toàn bộ bộ lọc** theo Năm học → Tuần.
5. *Thi đua giữa các Chi đoàn theo tuần/tháng/học kỳ/năm*, dựa cả điểm hoạt động và điểm thi đua trường.
6. *Chính sách giữ dữ liệu:* thông báo đã đọc 90 ngày, chưa đọc 120 ngày, nhật ký 120 ngày.
7. Quyết định **làm** nhắc lịch, góp ý ẩn danh, bình chọn, đếm ngược, hàng chờ duyệt, lịch công tác, đăng nhập vân tay; và **không làm** những chức năng khác.

**Về trải nghiệm và giao diện**
8. Em **chê** giao diện nặng thẻ, yêu cầu **gọn, full chiều ngang, màu xanh Đoàn**.
9. Em yêu cầu mobile **danh sách một dòng**, rồi đổi: *"bấm vào mở thẳng chi tiết thay vì mở hộp thoại"*.
10. Em chọn **quay lại** bố cục trang chủ cũ khi thấy bản "tin nổi bật" chưa ưng.
11. Em chỉ ra **lỗi bố cục trên điện thoại** bằng ảnh chụp, chỉ ra tên bị nút tìm kiếm che, ô mất focus khi gõ, chữ chạy không nối đuôi...
12. Em chỉ đạo **banner**: phải sắc nét, có thông tin ở giữa, hai bên là dòng chữ viết tay, nền nhiều chi tiết hơn.
13. Em yêu cầu **tên gọi chuẩn**: "Cổng thông tin điện tử", đổi "Website công khai" thành "Cổng thông tin".
14. Em thêm các **tiện ích hằng ngày**: nút xem mật khẩu, tự tải tệp CSV mật khẩu tạm, màn hình chờ nền xanh, biểu tượng ứng dụng nền xanh.

**Về vận hành**
15. Em phát hiện và yêu cầu xử lý các vấn đề thật: **mất kết nối cơ sở dữ liệu**, **chậm**, màn hình đen khi mở ứng dụng, cuộn bị giật.

> **Cách kể:** "Em không chỉ nói 'làm cho em trang web'. Em **nói rõ từng quy tắc**, **xem kết quả**, và **đổi ý khoảng X lần** khi thấy chưa đúng nhu cầu thực tế." (X: tự đếm theo nhật ký.)

---

## 5. Điểm mạnh của cách làm này (nói để ghi điểm)

1. **Tốc độ:** một người làm được hệ thống lớn (61 trang, 33 bảng) mà trước đây cần cả nhóm.
2. **Tập trung vào bài toán thật** thay vì mất thời gian cú pháp.
3. **Vòng phản hồi nhanh:** nhìn thấy kết quả, chỉnh lại trong vài phút.
4. **Hạ rào cản:** người không chuyên CNTT vẫn tạo được sản phẩm thật, đáng giá cho học sinh THPT.
5. **Học được nhiều:** đọc mã AI viết, hỏi AI giải thích, hiểu cách một hệ thống thông tin vận hành.
6. **Phản ánh xu hướng nghề nghiệp:** làm việc với AI là kỹ năng của người làm công nghệ tương lai.

## 6. Rủi ro của cách làm này và cách đã/đang kiểm soát

| Rủi ro của vibe coding | Biểu hiện | Cách kiểm soát (nói với giám khảo) |
|---|---|---|
| **Không hiểu sản phẩm của mình** | Giám khảo hỏi "cái này hoạt động ra sao" không trả lời được | Học tệp 02, 07, 08; luyện nói. **Đây là rủi ro lớn nhất khi thi.** |
| **Lỗ hổng bảo mật ẩn** | AI có thể quên kiểm tra quyền | Rà theo danh sách lỗ hổng phổ biến; **kiểm tra quyền ở máy chủ**; thử vượt quyền thật (bí thư vào lớp khác) |
| **Lỗi logic không phát hiện** | Điểm tính sai ở trường hợp hiếm | Giao dịch + ràng buộc unique; kiểm thử các tình huống chính; **chưa có test tự động** (thừa nhận) |
| **Mã khó bảo trì** | Người sau không hiểu | Phân lớp thư mục, có `README.md`, `MO-TA-HE-THONG.md`, bộ tài liệu này |
| **Phụ thuộc AI** | Không tự sửa được khi hỏng | Dùng công nghệ phổ biến; giữ **lịch sử Git** để quay lui; ghi hướng dẫn triển khai |
| **AI "tự tin" nói sai** | Báo đã xong nhưng chưa đúng | Luôn **chạy thử bằng mắt**, đối chiếu ảnh chụp màn hình |
| **Vấn đề bản quyền/giấy phép** | Mã giống mã nguồn khác | Dùng thư viện mã nguồn mở đúng giấy phép; không sao chép sản phẩm thương mại |
| **Dữ liệu cá nhân bị đưa cho AI** | Dán dữ liệu học sinh thật vào công cụ AI | **Chỉ dùng dữ liệu mẫu** khi làm việc với AI; không đưa dữ liệu thật |

---

## 7. Trả lời trung thực về việc dùng AI (rất quan trọng với giám khảo)

### 7.1 Mẫu "Khai báo sử dụng công cụ AI" (có thể đưa vào báo cáo/poster)

> **Khai báo công cụ hỗ trợ:** Nhóm tác giả xác định bài toán, thiết kế chức năng, quy tắc nghiệp vụ và giao diện; kiểm thử và chịu trách nhiệm về sản phẩm. Trong quá trình phát triển, nhóm **sử dụng công cụ trí tuệ nhân tạo (trợ lý lập trình) để hỗ trợ viết mã** theo yêu cầu của nhóm. Nhóm đã kiểm tra, thử nghiệm và hiệu chỉnh kết quả; lịch sử phát triển (Git) và nhật ký trao đổi được lưu để đối chiếu.

> ⚠ **Hãy kiểm tra quy chế/thể lệ cuộc thi** xem có quy định về việc sử dụng AI (thường yêu cầu khai báo, hoặc giới hạn mức độ). Làm đúng thể lệ quan trọng hơn mọi kỹ thuật trình bày.

### 7.2 Các câu giám khảo hay hỏi và cách trả lời

**"Có phải AI làm hết, em chỉ ngồi yêu cầu không?"**
> "Dạ không ạ. AI giúp em **viết mã nhanh**, nhưng **bài toán, các quy tắc của Đoàn, cách tính điểm, phân quyền, giao diện đều do em quyết định**, và em **thử từng chức năng, chỉ ra lỗi và yêu cầu sửa** nhiều lần. Ví dụ, ban đầu bí thư là tài khoản riêng, em thấy không đúng thực tế nên yêu cầu đổi thành đoàn viên được giao thêm quyền."

**"Em có hiểu mã không? Giải thích thử một phần."**
> "Em hiểu **nguyên lý hoạt động**. Ví dụ điểm danh: mã QR là một vé ký số sống 90 giây; máy chủ kiểm tra rồi ghi điểm danh và cộng điểm trong một giao dịch nên không bị lệch. Em chưa tự gõ từng dòng mã, nhưng em đọc, kiểm tra được cách nó chạy." (Dùng ví dụ ở tệp 02, 07.)

**"Nếu AI viết sai thì sao? Làm sao em biết nó đúng?"**
> "Em kiểm tra **bằng ba cách**: chạy thử các tình huống thật trên máy tính và điện thoại; công cụ kiểm tra kiểu của TypeScript; và **thử cố tình làm sai** (ví dụ bí thư vào lớp khác, quét mã hai lần) để xem hệ thống có chặn không. Em cũng ghi nhận **hạn chế**: chưa có bộ kiểm thử tự động."

**"Nếu không có AI, em có làm được không?"**
> "Với thời gian này thì không làm được ở quy mô như vậy. Nhưng em có ý tưởng và hiểu nghiệp vụ nên biết **cần làm gì và làm đúng chưa**. Em đang **học dần mã nguồn** để tự bảo trì. Em coi AI như một **công cụ**, giống máy tính bỏ túi giúp tính nhanh còn người ra bài vẫn phải biết bài toán."

**"Em học được gì từ đề tài này?"**
> "Em học cách **biến nhu cầu thực tế thành yêu cầu rõ ràng**, hiểu một hệ thống thông tin gồm giao diện, máy chủ, cơ sở dữ liệu, bảo mật, và học cách **làm việc với AI đúng cách**: chỉ đạo rõ, kiểm tra kỹ, không tin mù quáng."

**"Sản phẩm này có đáng tin để dùng thật không khi do AI viết?"**
> "Em xem như mọi phần mềm: phải **kiểm thử và giám sát**. Hệ thống có phân quyền kiểm tra ở máy chủ, nhật ký thao tác, và em đã nêu rõ hạn chế. Em đề xuất **thí điểm** ở vài Chi đoàn trước, có giáo viên tin học rà soát trước khi dùng toàn trường."

**"Việc này khác gì gian lận, nhờ người khác làm?"**
> "Em **công khai** việc dùng công cụ AI trong báo cáo. Giống như dùng máy tính hay phần mềm vẽ, khác biệt nằm ở chỗ **ý tưởng, quyết định và kiểm chứng là của em**."

---

## 8. Để "xứng đáng" với sản phẩm: học 10 điều cốt lõi trước ngày thi

Không cần đọc hết 11.000 dòng mã. **Hiểu và nói được 10 điều** sau là đủ trả lời hầu hết câu hỏi:

1. Hệ thống gồm những phần nào và nói chuyện với nhau ra sao (sơ đồ 3 tầng, tệp 07 mục 1).
2. Một lượt đăng nhập diễn ra thế nào (mật khẩu băm + phiên JWT trong cookie).
3. Phân quyền: 3 vai trò + Quản trị hệ thống, kiểm tra ở máy chủ.
4. **Luồng điểm danh QR** từng bước (quan trọng nhất).
5. Vì sao dùng **giao dịch** khi điểm danh.
6. **Công thức thi đua** (điểm bình quân mỗi đoàn viên).
7. Cách **chuyển năm học** tự động (10→11→12 → ra trường, giữ dữ liệu).
8. Bảng dữ liệu chính và quan hệ (Đoàn viên – Chi đoàn – Hoạt động – Điểm danh – Điểm).
9. Thông báo đẩy + PWA hoạt động ra sao (ở mức ý chính).
10. **Hạn chế và hướng phát triển** (nói thẳng).

**Cách học nhanh:** mỗi điều, **nhờ AI giải thích bằng ví dụ**, rồi **tự nói lại bằng lời của mình** và nhờ AI "phản biện như giám khảo". (Chính đây là cách vibe coding giúp em học.)

**Mười tệp mã đáng mở xem một lần** (để biết nó nằm ở đâu, không cần đọc hiểu từng dòng):
`src/actions/activities.ts` (điểm danh, đăng ký) · `src/lib/services/attendance.ts` (ghi điểm + giao dịch) · `src/lib/services/emulation.ts` (thi đua) · `src/lib/services/rollover.ts` (chuyển năm học) · `src/lib/auth/session.ts` (phiên đăng nhập) · `src/lib/permissions/index.ts` (phân quyền) · `src/actions/leaders.ts` (Ban chấp hành) · `src/actions/passkeys.ts` (vân tay) · `prisma/schema.prisma` (toàn bộ bảng dữ liệu) · `src/lib/school-calendar.ts` (lịch tuần).

---

## 9. Gợi ý cách "nâng tầm" bài thi nhờ góc nhìn vibe coding

Giám khảo ngày nay quan tâm đến **năng lực làm việc với AI**. Thay vì giấu, hãy **biến thành điểm cộng**:

- **Có quy trình rõ ràng:** Yêu cầu → AI viết → Em thử → Em nhận xét → Lặp lại (vẽ thành sơ đồ trên poster).
- **Có nhật ký quyết định:** liệt kê 8–10 quyết định của em (mục 4).
- **Có kiểm chứng:** bảng "Em đã kiểm tra những gì" (đăng nhập 3 vai trò, vượt quyền, quét trùng, thu hồi tài khoản...).
- **Có đánh giá rủi ro AI và biện pháp:** bảng ở mục 6.
- **Có tài liệu để người khác tiếp quản:** bộ tài liệu trong thư mục này.
- **Có tư duy đạo đức:** không đưa dữ liệu thật cho AI, khai báo minh bạch, tôn trọng thể lệ.

> **Một câu kết đáng nhớ để nói cuối phần AI:**
> *"Em không coi AI là người làm thay em, mà là một **trợ lý rất nhanh**. Em là người **đặt câu hỏi đúng, phán xét kết quả và chịu trách nhiệm**."*

---

## 10. Lưu ý đạo đức và pháp lý khi dùng AI để làm sản phẩm dự thi

1. **Đọc kỹ thể lệ cuộc thi** về sử dụng công cụ AI; khai báo đúng yêu cầu.
2. **Không đưa dữ liệu cá nhân thật** của học sinh vào công cụ AI; dùng dữ liệu mẫu.
3. **Kiểm tra giấy phép** các thư viện dùng trong sản phẩm (đã dùng thư viện mã nguồn mở phổ biến).
4. **Không nói sai sự thật** về mức độ tự viết mã; nếu giám khảo hỏi thẳng, trả lời thẳng.
5. **Có người lớn rà soát** (giáo viên hướng dẫn, giáo viên tin học) trước khi dùng thật với dữ liệu học sinh.
