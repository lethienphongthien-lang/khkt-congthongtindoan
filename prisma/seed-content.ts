/**
 * NẠP NỘI DUNG DEMO CHO TRANG CÔNG KHAI – chỉ THÊM, không xóa dữ liệu hiện có (chạy lặp lại an toàn).
 * Bài viết có slug bắt đầu bằng "demo-" và tiêu đề có tiền tố "[Demo]" để dễ tìm và xóa.
 *
 *   npm run db:seed-content
 */
import { PrismaClient, type ArticleKind } from "@prisma/client";

const db = new PrismaClient();
const DAY = 86_400_000;
const now = Date.now();
const TAG = "[Demo] ";

type A = { slug: string; kind: ArticleKind; title: string; summary: string; content: string; ago: number; eventIn?: number; place?: string };

const ARTICLES: A[] = [
  // Tin tức
  { slug: "demo-tin-1", kind: "NEWS", ago: 1, title: "Ngày Chủ nhật xanh: hơn 100 đoàn viên chung tay làm sạch trường học", summary: "Sáng Chủ nhật, đoàn viên các Chi đoàn tham gia dọn dẹp khuôn viên, trồng thêm cây xanh và phân loại rác thải.",
    content: "## Một buổi sáng nhiều ý nghĩa\nVới tinh thần “Thanh niên tình nguyện vì môi trường”, đoàn viên các Chi đoàn khối 10, 11, 12 đã có mặt từ 7 giờ sáng tại sân trường.\n\n## Kết quả\n- Hơn 100 đoàn viên tham gia\n- Thu gom và phân loại hơn 30 bao rác\n- Trồng mới 20 cây xanh khu vực sân sau\n\nHoạt động nhận được sự ủng hộ của thầy cô và phụ huynh, góp phần lan tỏa lối sống xanh trong học sinh." },
  { slug: "demo-tin-2", kind: "NEWS", ago: 4, title: "Chi đoàn 12A1 đạt giải Nhất cuộc thi Rung chuông vàng", summary: "Cuộc thi thu hút sự tham gia của các Chi đoàn khối 10, 11, 12 với nhiều phần thi hấp dẫn.",
    content: "Sau ba vòng thi căng thẳng về kiến thức Đoàn, lịch sử địa phương và kỹ năng sống, đội thi Chi đoàn 12A1 đã xuất sắc giành giải Nhất.\n\n## Cơ cấu giải thưởng\n1. Giải Nhất: Chi đoàn 12A1\n2. Giải Nhì: Chi đoàn 11A1\n3. Giải Ba: Chi đoàn 10A1\n\nBan tổ chức gửi lời cảm ơn các thầy cô đã đồng hành cùng cuộc thi." },
  { slug: "demo-tin-3", kind: "NEWS", ago: 9, title: "Hiến máu nhân đạo: lan tỏa nghĩa cử cao đẹp", summary: "Chương trình hiến máu tình nguyện thu hút đông đảo đoàn viên, giáo viên và phụ huynh.",
    content: "Chương trình hiến máu nhân đạo là hoạt động thường niên của Đoàn trường, năm nay có hơn 60 đơn vị máu được tiếp nhận.\n\n- Đối tượng: đoàn viên đủ 18 tuổi, giáo viên, phụ huynh\n- Địa điểm: Hội trường nhà trường" },
  { slug: "demo-tin-4", kind: "NEWS", ago: 15, title: "Đại hội Chi đoàn nhiệm kỳ mới được tổ chức đồng loạt", summary: "Các Chi đoàn bầu Ban chấp hành, đề ra phương hướng hoạt động cho năm học mới.",
    content: "Đại hội Chi đoàn là dịp để đoàn viên đánh giá kết quả hoạt động của nhiệm kỳ cũ và bầu ra Ban chấp hành mới.\n\n## Nội dung chính\n- Báo cáo tổng kết nhiệm kỳ\n- Bầu Ban chấp hành, Bí thư, Phó Bí thư\n- Thảo luận phương hướng năm học mới" },
  { slug: "demo-tin-5", kind: "NEWS", ago: 22, title: "Giải bóng đá mini chào mừng năm học mới", summary: "Sân chơi thể thao sôi nổi giữa các Chi đoàn, tăng cường tinh thần đoàn kết.",
    content: "Giải đấu diễn ra trong ba buổi chiều với sự tham gia của 12 đội bóng đến từ các Chi đoàn.\n\nChúc mừng đội bóng Chi đoàn 11A1 đã giành chức vô địch." },
  { slug: "demo-tin-6", kind: "NEWS", ago: 30, title: "Tuyên truyền phòng chống tác hại của thuốc lá điện tử trong học sinh", summary: "Buổi sinh hoạt ngoại khóa nâng cao nhận thức cho đoàn viên về tác hại của thuốc lá điện tử.",
    content: "Buổi sinh hoạt có sự tham gia của cán bộ y tế địa phương, cung cấp thông tin khoa học về tác hại của thuốc lá điện tử đối với sức khỏe thanh thiếu niên." },
  // Kế hoạch
  { slug: "demo-kh-1", kind: "PLAN", ago: 20, title: "Kế hoạch công tác Đoàn năm học 2026–2027", summary: "Định hướng hoạt động của Đoàn trường trong năm học mới.",
    content: "## Mục tiêu\n1. Nâng cao chất lượng sinh hoạt Chi đoàn\n2. Đẩy mạnh phong trào tình nguyện\n3. Tổ chức các hoạt động văn hóa, thể thao\n\n## Nhiệm vụ trọng tâm\n- Xây dựng Chi đoàn vững mạnh\n- Tuyên truyền an toàn giao thông\n- Tăng cường ứng dụng công nghệ trong quản lý đoàn viên" },
  { slug: "demo-kh-2", kind: "PLAN", ago: 6, title: "Kế hoạch tổ chức Hội thi Đoàn viên tài năng", summary: "Hội thi nhằm phát hiện và bồi dưỡng các đoàn viên có năng khiếu.",
    content: "## Nội dung thi\n- Văn nghệ\n- Kiến thức Đoàn\n- Kỹ năng sinh tồn\n\n## Thời gian và đối tượng\nHội thi dành cho toàn thể đoàn viên; mỗi Chi đoàn cử tối đa 5 thí sinh." },
  { slug: "demo-kh-3", kind: "PLAN", ago: 11, title: "Kế hoạch hoạt động tình nguyện Mùa hè xanh", summary: "Định hướng các hoạt động tình nguyện trong dịp hè.",
    content: "Các Chi đoàn đăng ký nội dung tình nguyện với Ban chấp hành Đoàn trường trước ngày 15 hằng tháng.\n\n- Hỗ trợ học sinh có hoàn cảnh khó khăn\n- Dọn vệ sinh môi trường\n- Tuyên truyền an toàn giao thông" },
  // Sự kiện
  { slug: "demo-sk-1", kind: "EVENT", ago: 2, eventIn: 9, place: "Hội trường trường THPT Sơn Hà", title: "Hội thi Đoàn viên tài năng", summary: "Sân chơi dành cho đoàn viên toàn trường.", content: "Mời toàn thể đoàn viên tham dự và cổ vũ cho các Chi đoàn.\n\n- Mở cửa: 7 giờ 30\n- Khai mạc: 8 giờ 00" },
  { slug: "demo-sk-2", kind: "EVENT", ago: 1, eventIn: 4, place: "Cổng trường", title: "Tuyên truyền an toàn giao thông", summary: "Đoàn viên tham gia hướng dẫn giao thông và phát tờ rơi.", content: "Đoàn viên mặc đồng phục, có mặt trước giờ vào lớp 15 phút." },
  { slug: "demo-sk-3", kind: "EVENT", ago: 3, eventIn: 16, place: "Sân vận động trường", title: "Ngày hội thể thao Đoàn viên", summary: "Các môn thi: chạy tiếp sức, kéo co, bóng chuyền.", content: "Mỗi Chi đoàn đăng ký đội tuyển với Ban chấp hành Đoàn trường." },
  { slug: "demo-sk-4", kind: "EVENT", ago: 5, eventIn: 27, place: "Hội trường trường THPT Sơn Hà", title: "Lễ kỷ niệm ngày thành lập Đoàn TNCS Hồ Chí Minh 26/3", summary: "Chương trình văn nghệ và trao thưởng các Chi đoàn tiêu biểu.", content: "Chương trình gồm văn nghệ chào mừng, trao giấy khen cho tập thể và cá nhân tiêu biểu." },
  // Thông báo
  { slug: "demo-tb-1", kind: "ANNOUNCEMENT", ago: 1, title: "Thông báo lịch sinh hoạt Chi đoàn tháng 10", summary: "Các Chi đoàn sinh hoạt định kỳ vào tuần cuối tháng.", content: "Các Chi đoàn sinh hoạt theo lịch của Ban chấp hành Đoàn trường. Bí thư Chi đoàn gửi biên bản về cho BCH Đoàn trường trước ngày 30." },
  { slug: "demo-tb-2", kind: "ANNOUNCEMENT", ago: 3, title: "Thông báo đăng ký tham gia Ngày Chủ nhật xanh", summary: "Đoàn viên đăng ký trên hệ thống quản lý Đoàn.", content: "Đoàn viên đăng nhập hệ thống, vào mục Hoạt động và bấm đăng ký tham gia." },
  { slug: "demo-tb-3", kind: "ANNOUNCEMENT", ago: 5, title: "Thông báo nộp báo cáo Chi đoàn tháng", summary: "Hạn nộp báo cáo là ngày 25 hằng tháng.", content: "Bí thư Chi đoàn đăng báo cáo trực tiếp trên hệ thống tại mục Báo cáo Chi đoàn." },
  { slug: "demo-tb-4", kind: "ANNOUNCEMENT", ago: 8, title: "Thông báo cấp tài khoản hệ thống quản lý đoàn viên", summary: "Mỗi đoàn viên được cấp tài khoản riêng để đăng ký và điểm danh hoạt động.", content: "Tên đăng nhập là mã đoàn viên. Đoàn viên nhận mật khẩu tạm thời từ Bí thư Chi đoàn và đổi mật khẩu ở lần đăng nhập đầu tiên." },
  { slug: "demo-tb-5", kind: "ANNOUNCEMENT", ago: 12, title: "Thông báo bình xét Chi đoàn tiêu biểu học kỳ I", summary: "Tiêu chí dựa trên điểm thi đua và mức độ tham gia hoạt động.", content: "Điểm thi đua gồm điểm do Đoàn trường ghi nhận và điểm hoạt động bình quân của đoàn viên." },
];

const PAGES: Record<string, [string, string]> = {
  "doan-truong": ["Đoàn trường", "## Giới thiệu chung\nĐoàn trường THPT Sơn Hà là tổ chức Đoàn cơ sở, tập hợp và đoàn kết đoàn viên thanh niên của nhà trường, hoạt động dưới sự lãnh đạo của Đảng và sự chỉ đạo của Đoàn cấp trên.\n\n## Chức năng, nhiệm vụ\n- Giáo dục lý tưởng cách mạng, đạo đức, lối sống cho đoàn viên\n- Tổ chức các hoạt động học tập, văn hóa, thể thao, tình nguyện\n- Đại diện, bảo vệ quyền và lợi ích hợp pháp của đoàn viên\n\n(Nội dung demo – Admin cập nhật trong mục Website công khai ▸ Trang giới thiệu.)"],
  "bch-doan-truong": ["Ban chấp hành Đoàn trường", "## Ban chấp hành nhiệm kỳ hiện tại\n- Bí thư: (họ và tên)\n- Phó Bí thư: (họ và tên)\n- Ủy viên Ban thường vụ: (họ và tên)\n- Ủy viên Ban chấp hành: (họ và tên)\n\n(Nội dung demo – cập nhật danh sách Ban chấp hành thực tế.)"],
  "co-cau-to-chuc": ["Cơ cấu tổ chức", "## Sơ đồ tổ chức\n- Ban chấp hành Đoàn trường\n- Các Chi đoàn khối 10\n- Các Chi đoàn khối 11\n- Các Chi đoàn khối 12\n\nMỗi Chi đoàn do một Bí thư phụ trách, sinh hoạt định kỳ hằng tháng.\n\n(Nội dung demo.)"],
  "noi-quy": ["Nội quy", "## Nội quy sinh hoạt Đoàn\n1. Đoàn viên tham gia sinh hoạt Chi đoàn đầy đủ, đúng giờ\n2. Chấp hành Điều lệ Đoàn và nội quy nhà trường\n3. Tích cực tham gia các hoạt động phong trào\n4. Đóng đoàn phí đầy đủ, đúng hạn\n5. Giữ gìn hình ảnh đoàn viên\n\n(Nội dung demo.)"],
};

async function main() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
  let created = 0;
  for (const a of ARTICLES) {
    if (await db.article.findUnique({ where: { slug: a.slug } })) continue;
    await db.article.create({
      data: {
        slug: a.slug, kind: a.kind, title: TAG + a.title, summary: a.summary, content: a.content, published: true,
        publishedAt: new Date(now - a.ago * DAY), authorId: admin?.id,
        eventAt: a.eventIn ? new Date(now + a.eventIn * DAY) : null, eventLocation: a.place ?? null,
      },
    });
    created++;
  }
  for (const [slug, [title, content]] of Object.entries(PAGES)) {
    const cur = await db.sitePage.findUnique({ where: { slug } });
    if (!cur || !cur.content.trim()) await db.sitePage.upsert({ where: { slug }, update: { content }, create: { slug, title, content } });
  }
  let reports = 0;
  for (const d of await db.department.findMany({ include: { secretary: true } })) {
    for (const [i, t] of ["Báo cáo hoạt động tháng 9", "Báo cáo sinh hoạt Chi đoàn tháng 10"].entries()) {
      const title = `${TAG}${t} – Chi đoàn ${d.name}`;
      if (await db.chapterReport.findFirst({ where: { departmentId: d.id, title } })) continue;
      await db.chapterReport.create({
        data: {
          departmentId: d.id, createdById: d.secretaryId, title, createdAt: new Date(now - (i ? 2 : 14) * DAY),
          content: `## Kết quả nổi bật\n- Sinh hoạt Chi đoàn đúng định kỳ, đoàn viên tham gia đầy đủ\n- Hoàn thành các nhiệm vụ do Đoàn trường giao\n- Tham gia tích cực các hoạt động tình nguyện\n\n## Tồn tại\n- Một số đoàn viên chưa chủ động đăng ký hoạt động\n\n## Phương hướng\nTiếp tục duy trì nề nếp và đẩy mạnh phong trào thi đua trong Chi đoàn.`,
        },
      });
      reports++;
    }
  }
  // Dòng chữ chạy đầu trang
  const marquee = [
    { text: "Chào mừng các bạn đến với website Đoàn trường THPT Sơn Hà", link: null },
    { text: "Đoàn viên đăng ký tham gia Ngày Chủ nhật xanh trên hệ thống quản lý Đoàn", link: "/thong-bao" },
    { text: "Bí thư các Chi đoàn nộp báo cáo tháng trước ngày 25", link: "/bao-cao-chi-doan" },
  ];
  let marq = 0;
  for (const [i, m] of marquee.entries()) {
    if (await db.marqueeItem.findFirst({ where: { text: m.text } })) continue;
    await db.marqueeItem.create({ data: { text: m.text, link: m.link, sortOrder: i } });
    marq++;
  }
  // Ảnh bìa + tệp đính kèm mẫu cho bài [Demo] (ảnh minh họa SVG trong public/demo-covers; PDF mẫu của Cloudinary demo) để xem hiển thị hình thu nhỏ
  const demo = await db.article.findMany({ where: { title: { startsWith: "[Demo]" } }, orderBy: { createdAt: "asc" }, include: { attachments: { select: { id: true } } } });
  let withMedia = 0;
  for (const [i, a] of demo.entries()) {
    if (a.kind === "NEWS" || a.kind === "EVENT") {
      // Bỏ qua 1 bài tin để thấy trường hợp "không có hình"
      if (i % 4 !== 3) {
        const t = a.title.toLowerCase();
        const motif = t.includes("chủ nhật xanh") ? "leaf" : t.includes("hiến máu") ? "heart" : t.includes("bóng") ? "ball" : t.includes("giao thông") ? "road" : t.includes("thuốc lá") || t.includes("tuyên truyền") ? "book" : "star";
        await db.article.update({ where: { id: a.id }, data: { coverUrl: `/demo-covers/${motif}.svg`, coverPublicId: null } });
        withMedia++;
      }
    } else if (a.attachments.length === 0 && i % 2 === 0) {
      const pdf = a.kind === "PLAN";
      await db.articleAttachment.create({ data: pdf
        ? { articleId: a.id, name: "ke-hoach-mau.pdf", url: "https://res.cloudinary.com/demo/image/upload/multi_page_pdf.pdf", publicId: "demo/multi_page_pdf", size: 120000, mime: "application/pdf" }
        : { articleId: a.id, name: "danh-sach-mau.xlsx", url: "https://res.cloudinary.com/demo/raw/upload/danh-sach-mau.xlsx", publicId: "demo/danh-sach-mau.xlsx", size: 20000, mime: "xlsx" } });
      withMedia++;
    }
  }
  console.log(`✓ Hình/tệp mẫu: ${withMedia} bài`);

  // Thông tin liên hệ hiển thị ở thanh trên cùng (chỉ điền nếu chưa có)
  for (const [key, value] of [["phone", "0255.3824775"], ["email", "vanphongso@quangngai.edu.vn"], ["facebook", "https://www.facebook.com/"], ["youtube", "https://www.youtube.com/"]]) {
    await db.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
  console.log(`✓ Nội dung demo: +${created} bài viết, +${reports} báo cáo Chi đoàn, +${marq} dòng chữ chạy, trang giới thiệu đã có nội dung (nếu trống).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
