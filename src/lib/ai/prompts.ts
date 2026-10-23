export type AiMode = "draft" | "polish" | "shorten" | "spelling" | "summary" | "title";
export type AiKind = "NEWS" | "PLAN" | "EVENT" | "ANNOUNCEMENT" | "STORY" | "CAREER" | "DOCUMENT";

const KIND_GUIDE: Record<AiKind, string> = {
  NEWS: "Tin tức: có tiêu đề ý chính ở đoạn mở đầu, nêu rõ ai, làm gì, khi nào, ở đâu, kết quả; giọng văn tường thuật.",
  PLAN: "Kế hoạch công tác Đoàn: các mục I. Mục đích, yêu cầu; II. Thời gian, địa điểm, thành phần; III. Nội dung, hình thức; IV. Tổ chức thực hiện. Dùng tiêu đề mục và danh sách gạch đầu dòng.",
  EVENT: "Sự kiện: giới thiệu ngắn, thời gian, địa điểm, thành phần tham gia, nội dung chính, kêu gọi tham gia.",
  ANNOUNCEMENT: "Thông báo: ngắn gọn, đi thẳng vào việc cần thông báo, nêu thời gian, địa điểm, đối tượng, yêu cầu cần làm.",
  STORY: "Câu chuyện đẹp của Chi đoàn: kể chuyện giàu cảm xúc, có nhân vật và việc làm cụ thể, kết bằng thông điệp tích cực.",
  DOCUMENT: "Tài liệu sinh hoạt Chi đoàn: nội dung sinh hoạt rõ ràng gồm chủ đề, mục tiêu, thời lượng, các bước tiến hành, câu hỏi thảo luận và lưu ý cho bí thư; giọng văn hướng dẫn.",
  CAREER: "Định hướng nghề nghiệp: thông tin rõ ràng về ngành, nghề, yêu cầu năng lực, cơ hội học tập, lời khuyên cho học sinh.",
};

export const SYSTEM = `Bạn là trợ lý soạn thảo nội dung cho Đoàn trường THPT Sơn Hà (Đoàn TNCS Hồ Chí Minh). Viết bằng tiếng Việt chuẩn, văn phong trong sáng, trang trọng vừa phải, phù hợp học sinh và phụ huynh.
Quy tắc bắt buộc:
- KHÔNG bịa số liệu, ngày giờ, địa điểm, tên người, thành tích. Thông tin nào người dùng chưa cung cấp thì để chỗ trống dạng [ghi rõ ... ] để họ điền.
- Không đưa thông tin cá nhân nhạy cảm. Không viết nội dung chính trị sai lệch, kích động hoặc xúc phạm.
- Chỉ trả về đúng nội dung được yêu cầu, không giải thích, không lời dẫn, không dùng khối mã.`;

const HTML_RULE = `Định dạng đầu ra là HTML đơn giản, CHỈ dùng các thẻ: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>. Không có <html>, <body>, không có style, không có ảnh.`;

export function buildPrompt(mode: AiMode, kind: AiKind, input: string, title: string): { prompt: string; maxTokens: number } {
  const ctx = title ? `Tiêu đề bài: "${title}".\n` : "";
  switch (mode) {
    case "draft":
      return { maxTokens: 3000, prompt: `Loại bài: ${KIND_GUIDE[kind]}\n\nHãy viết một bài hoàn chỉnh dựa trên các ý sau của người soạn:\n"""\n${input}\n"""\n\nTrả về DUY NHẤT một đối tượng JSON có 3 trường chuỗi:\n- "title": tiêu đề bài, rõ ràng, hấp dẫn, tối đa 90 ký tự, không dùng dấu ngoặc kép.\n- "summary": tóm tắt 2 đến 3 câu, tối đa 350 ký tự, văn bản thuần.\n- "content": nội dung bài ở dạng HTML. ${HTML_RULE} Khoảng 250 đến 450 từ, không lặp lại tiêu đề ở đầu nội dung.` };
    case "title":
      return { maxTokens: 200, prompt: `Hãy đề xuất MỘT tiêu đề ngắn gọn, rõ ràng, hấp dẫn (tối đa 90 ký tự, không dấu ngoặc kép) cho bài sau. Chỉ trả về tiêu đề, không giải thích.\n\n"""\n${input}\n"""` };
    case "polish":
      return { maxTokens: 4000, prompt: `${ctx}Hãy nhuận sắc đoạn nội dung sau: giữ NGUYÊN ý và mọi thông tin, làm câu văn mạch lạc, trong sáng, đúng chính tả, giữ cấu trúc tiêu đề và danh sách.\n\n"""\n${input}\n"""\n\n${HTML_RULE}` };
    case "shorten":
      return { maxTokens: 3000, prompt: `${ctx}Hãy rút gọn nội dung sau còn khoảng một nửa độ dài, giữ lại các ý chính và mọi thông tin cụ thể (thời gian, địa điểm, tên), bỏ phần lặp và rườm rà.\n\n"""\n${input}\n"""\n\n${HTML_RULE}` };
    case "spelling":
      return { maxTokens: 4000, prompt: `Hãy sửa lỗi chính tả, dấu câu, viết hoa và ngữ pháp trong nội dung sau. KHÔNG đổi ý, KHÔNG thêm bớt thông tin, giữ nguyên bố cục.\n\n"""\n${input}\n"""\n\n${HTML_RULE}` };
    case "summary":
      return { maxTokens: 400, prompt: `${ctx}Hãy tóm tắt nội dung sau thành 2 đến 3 câu (tối đa 350 ký tự) để hiện ở danh sách bài. Chỉ trả về văn bản thuần, không thẻ HTML, không dấu gạch đầu dòng.\n\n"""\n${input}\n"""` };
  }
}
