/**
 * SEED / DEMO DATA – chỉ dùng cho môi trường phát triển và trình diễn.
 * KHÔNG chạy trên dữ liệu thật: script xóa sạch dữ liệu hiện có.
 *
 * Chạy:  npm run db:seed
 * Tài khoản demo (mật khẩu chung: Doan@2026):
 *   admin | bithu.10a1, bithu.11a1, bithu.12a1 | SH20260001 … SH20260030
 */
import { PrismaClient } from "@prisma/client";
import { schoolYearStart, startYearFor } from "../src/lib/school-year";
import { hashPassword } from "../src/lib/auth/password";
import { createMemberWithAccount, ensureMemberProfile, findOrCreateClass, nextMemberCodes } from "../src/lib/services/member-account";

const db = new PrismaClient();
const DEMO_PASSWORD = "Doan@2026";
const DEMO_TAG = "[Dữ liệu demo] ";

const NAMES = [
  "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Minh Đức", "Võ Thị Hà", "Đặng Quốc Huy", "Bùi Thanh Hương", "Hoàng Văn Khánh",
  "Ngô Thị Lan", "Đỗ Gia Linh", "Dương Minh Nhật", "Lý Thị Oanh", "Phan Văn Phúc", "Trương Thị Quỳnh", "Huỳnh Minh Quân", "Vũ Thị Thảo",
  "Đinh Công Thành", "Mai Thị Thu", "Tạ Văn Toàn", "Châu Thị Trang", "Nguyễn Hữu Trí", "Lương Thị Uyên", "Cao Văn Việt", "Hồ Thị Xuân",
  "Lâm Gia Bảo", "Kiều Thị Diệp", "Tô Minh Hiếu", "Quách Thị Kim", "Lại Văn Long", "Thái Thị My",
];

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export async function seedDemo() {
  console.log("⚠ Đang nạp DỮ LIỆU DEMO – dữ liệu hiện có sẽ bị xóa.");
  // Xóa theo thứ tự phụ thuộc
  await db.$transaction([
    db.auditLog.deleteMany(), db.notification.deleteMany(), db.memberBadge.deleteMany(), db.pointTransaction.deleteMany(),
    db.attendance.deleteMany(), db.activityRegistration.deleteMany(), db.activityImage.deleteMany(), db.activity.deleteMany(),
    db.article.deleteMany(), db.sitePage.deleteMany(), db.siteSetting.deleteMany(), db.chapterReport.deleteMany(), db.emulationRecord.deleteMany(), db.post.deleteMany(), db.badge.deleteMany(), db.member.deleteMany(), db.class.deleteMany(), db.department.deleteMany(), db.user.deleteMany(), db.activityCategory.deleteMany(),
  ]);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // Loại hoạt động & điểm mặc định (cấu hình hệ thống)
  const catDefs = [["Tình nguyện", 10], ["Học tập", 5], ["Văn hóa", 5], ["Thể thao", 5], ["Hoạt động Đoàn", 3]] as const;
  const cats: Record<string, string> = {};
  for (const [name, defaultPoints] of catDefs) cats[name] = (await db.activityCategory.create({ data: { name, defaultPoints } })).id;

  const admin = await db.user.create({
    data: { username: "admin", fullName: "Quản trị viên Đoàn trường", role: "ADMIN", superAdmin: true, passwordHash, mustChangePassword: false },
  });

  // 3 Chi đoàn + 3 Bí thư
  const deptDefs = [{ name: "10A1", sec: "Nguyễn Thị Mai" }, { name: "11A1", sec: "Trần Văn Nam" }, { name: "12A1", sec: "Lê Thị Phương" }];
  const depts: { id: string; name: string; secretaryId: string }[] = [];
  for (const d of deptDefs) {
    const sec = await db.user.create({
      data: { username: `bithu.${d.name.toLowerCase()}`, fullName: d.sec, role: "SECRETARY", passwordHash, mustChangePassword: false },
    });
    const dept = await db.department.create({ data: { name: d.name, startYear: startYearFor(Number(d.name.slice(0, 2)), schoolYearStart()), secretaryId: sec.id } });
    depts.push({ id: dept.id, name: d.name, secretaryId: sec.id });
  }

  // 30 Đoàn viên (10 / Chi đoàn)
  const members: { id: string; userId: string; departmentId: string }[] = [];
  const codes = await nextMemberCodes(db, 2026, NAMES.length);
  for (let i = 0; i < NAMES.length; i++) {
    const dept = depts[Math.floor(i / 10)];
    const cls = await findOrCreateClass(db, dept.id, dept.name);
    const { member } = await createMemberWithAccount(
      db,
      {
        fullName: NAMES[i], gender: i % 2 ? "Nữ" : "Nam", dateOfBirth: new Date(Date.UTC(2008 + (Math.floor(i / 10) === 0 ? 1 : Math.floor(i / 10) === 1 ? 0 : -1), i % 12, 5 + (i % 20), 12)),
        joinedAt: new Date(Date.UTC(2024, 2, 26, 12)), cohort: 2025 - Math.floor(i / 10), departmentId: dept.id, classId: cls.id,
      },
      codes[i],
      { passwordHash },
    );
    await db.user.update({ where: { id: member.userId }, data: { mustChangePassword: false } });
    members.push({ id: member.id, userId: member.userId, departmentId: dept.id });
  }

  // Bí thư cũng là đoàn viên (cùng một tài khoản): tạo hồ sơ đoàn viên cho tài khoản bí thư
  for (const d of depts) {
    const u = await db.user.findUniqueOrThrow({ where: { id: d.secretaryId } });
    await ensureMemberProfile(db, u, d);
  }

  // Huy hiệu mẫu
  await db.badge.createMany({
    data: [
      { name: "Đoàn viên tích cực", description: "Tham gia từ 5 hoạt động", icon: "star", criteria: "ACTIVITY_COUNT", threshold: 5 },
      { name: "Chiến sĩ chăm chỉ", description: "Tham gia từ 8 hoạt động", icon: "trophy", criteria: "ACTIVITY_COUNT", threshold: 8 },
      { name: "Trái tim tình nguyện", description: "Đạt 10 giờ tình nguyện", icon: "heart", criteria: "VOLUNTEER_HOURS", threshold: 10 },
      { name: "Điểm số 50", description: "Đạt 50 điểm hoạt động", icon: "medal", criteria: "TOTAL_POINTS", threshold: 50 },
      { name: "Hoạt động môi trường", description: "Tham gia 2 hoạt động tình nguyện", icon: "leaf", criteria: "CATEGORY_COUNT", threshold: 2, categoryId: cats["Tình nguyện"] },
    ],
  });

  // 10 hoạt động
  const now = Date.now();
  type A = { title: string; cat: keyof typeof cats; dept: number | null; daysAgo: number; hours: number; vol: number; location: string; max?: number };
  const acts: A[] = [
    { title: "Sinh hoạt Chi đoàn tháng 7", cat: "Hoạt động Đoàn", dept: 0, daysAgo: 85, hours: 2, vol: 0, location: "Phòng học 10A1" },
    { title: "Hiến máu nhân đạo", cat: "Tình nguyện", dept: null, daysAgo: 70, hours: 4, vol: 4, location: "Hội trường trường THPT Sơn Hà", max: 60 },
    { title: "Giải bóng đá mini chào năm học mới", cat: "Thể thao", dept: null, daysAgo: 56, hours: 3, vol: 0, location: "Sân vận động trường" },
    { title: "Sinh hoạt Chi đoàn tháng 8", cat: "Hoạt động Đoàn", dept: 1, daysAgo: 45, hours: 2, vol: 0, location: "Phòng học 11A1" },
    { title: "Cuộc thi Rung chuông vàng", cat: "Học tập", dept: null, daysAgo: 38, hours: 3, vol: 0, location: "Hội trường" },
    { title: "Ngày Chủ nhật xanh tháng 9", cat: "Tình nguyện", dept: null, daysAgo: 21, hours: 3.5, vol: 3.5, location: "Sân trường THPT Sơn Hà", max: 50 },
    { title: "Văn nghệ chào mừng 20/11", cat: "Văn hóa", dept: 2, daysAgo: 9, hours: 2, vol: 0, location: "Sân khấu ngoài trời" },
    { title: "Ngày Chủ nhật xanh tháng 10", cat: "Tình nguyện", dept: 0, daysAgo: 0, hours: 3, vol: 3, location: "Sân trường THPT Sơn Hà", max: 50 },
    { title: "Tuyên truyền an toàn giao thông", cat: "Hoạt động Đoàn", dept: 0, daysAgo: -6, hours: 2, vol: 0, location: "Cổng trường" },
    { title: "Hội thi Đoàn viên tài năng", cat: "Văn hóa", dept: null, daysAgo: -14, hours: 3, vol: 0, location: "Hội trường" },
  ];
  const catPoints: Record<string, number> = Object.fromEntries(catDefs);
  const created: { id: string; departmentId: string | null; points: number; vol: number; past: boolean; title: string; start: Date }[] = [];
  for (const a of acts) {
    const start = a.daysAgo === 0 ? new Date(now - HOUR) : new Date(now - a.daysAgo * DAY + HOUR - (now % DAY));
    const end = new Date(start.getTime() + a.hours * HOUR);
    const dept = a.dept === null ? null : depts[a.dept];
    const act = await db.activity.create({
      data: {
        title: a.title, description: `${DEMO_TAG}${a.title} – hoạt động mẫu để trình diễn hệ thống.`, location: a.location, startAt: start, endAt: end,
        categoryId: cats[a.cat], departmentId: dept?.id ?? null, maxParticipants: a.max, points: catPoints[a.cat], volunteerHours: a.vol,
        createdById: dept?.secretaryId ?? admin.id, checkinOpen: a.daysAgo === 0,
      },
    });
    created.push({ id: act.id, departmentId: act.departmentId, points: act.points, vol: a.vol, past: end.getTime() < now, title: a.title, start });
  }

  // Đăng ký + điểm danh mẫu (xác định, không ngẫu nhiên)
  for (const act of created) {
    const eligible = members.filter((m) => !act.departmentId || m.departmentId === act.departmentId);
    for (let idx = 0; idx < eligible.length; idx++) {
      const m = eligible[idx];
      const seed = (idx * 7 + act.title.length) % 10;
      if (!act.past) {
        // sắp diễn ra / đang diễn ra: một nửa đoàn viên đã đăng ký, chưa ai điểm danh sẵn
        if (seed < 5) await db.activityRegistration.create({ data: { activityId: act.id, memberId: m.id } });
        continue;
      }
      if (seed < 7) { // ~70% tham gia
        await db.activityRegistration.create({ data: { activityId: act.id, memberId: m.id } });
        await db.$transaction(async (tx) => {
          const att = await tx.attendance.create({
            data: { activityId: act.id, memberId: m.id, method: "QR", checkedInAt: new Date(act.start.getTime() + 10 * 60_000 + idx * 20_000), deviceInfo: "seed" },
          });
          await tx.pointTransaction.create({ data: { memberId: m.id, activityId: act.id, attendanceId: att.id, type: "ACTIVITY", points: act.points, reason: `Tham gia: ${act.title}`, createdAt: att.checkedInAt } });
          await tx.member.update({ where: { id: m.id }, data: { totalPoints: { increment: act.points }, volunteerMinutes: { increment: Math.round(act.vol * 60) } } });
        });
      } else if (seed < 8) {
        await db.activityRegistration.create({ data: { activityId: act.id, memberId: m.id } }); // đăng ký nhưng vắng
      }
    }
  }
  // Điều chỉnh điểm mẫu
  await db.$transaction([
    db.pointTransaction.create({ data: { memberId: members[0].id, type: "ADJUSTMENT", points: 5, reason: "Thưởng: đóng góp tích cực cho Đoàn trường (demo)", createdById: admin.id } }),
    db.member.update({ where: { id: members[0].id }, data: { totalPoints: { increment: 5 } } }),
  ]);

  const lead = await db.user.findFirstOrThrow({ where: { username: "bithu.10a1" } });
  const p1 = await db.post.create({ data: { authorId: admin.id, content: `${DEMO_TAG}Đoàn trường thông báo: Ngày Chủ nhật xanh tháng 10 sẽ diễn ra tại sân trường. Các Chi đoàn đăng ký tham gia trên hệ thống nhé!` } });
  await db.post.create({ data: { authorId: lead.id, departmentId: depts[0].id, content: `${DEMO_TAG}Chi đoàn 10A1 nhắc các bạn mang theo găng tay và túi rác khi tham gia hoạt động.` } });
  await db.postLike.createMany({ data: members.slice(0, 5).map((m) => ({ postId: p1.id, userId: m.userId })) });
  await db.postComment.create({ data: { postId: p1.id, userId: members[0].userId, content: "Em đã đăng ký rồi ạ!" } });

  const recs: [number, number, string, number][] = [[0, 5, "Nề nếp tuần tốt", 3], [1, 3, "Phong trào văn nghệ", 10], [2, 4, "Nề nếp tuần tốt", 3], [0, -2, "Đi học muộn nhiều", 12], [1, 6, "Giải nhất thi Rung chuông vàng", 38], [2, 2, "Vệ sinh lớp học sạch", 8]];
  for (const [d, points, reason, daysAgo] of recs) {
    await db.emulationRecord.create({ data: { departmentId: depts[d].id, points, reason: `${DEMO_TAG}${reason}`, recordedAt: new Date(now - daysAgo * DAY), createdById: admin.id } });
  }

  // Nội dung trang công khai (demo)
  const day = (n: number) => new Date(now - n * DAY);
  const articles: { kind: "NEWS" | "PLAN" | "EVENT" | "ANNOUNCEMENT"; title: string; summary: string; content: string; ago: number; eventAt?: Date; eventLocation?: string }[] = [
    { kind: "NEWS", title: "Đoàn trường tổ chức Ngày Chủ nhật xanh hưởng ứng phong trào bảo vệ môi trường", summary: "Hàng trăm đoàn viên tham gia dọn vệ sinh khuôn viên trường và khu vực lân cận.", content: "## Hoạt động nổi bật\nSáng Chủ nhật, đoàn viên các Chi đoàn đã tham gia dọn dẹp sân trường, trồng thêm cây xanh và phân loại rác thải.\n\n- Số đoàn viên tham gia: hơn 100 em\n- Thời gian: 3 giờ\n\nHoạt động nhận được sự ủng hộ của thầy cô và phụ huynh.", ago: 2 },
    { kind: "NEWS", title: "Chi đoàn 12A1 đạt giải Nhất cuộc thi Rung chuông vàng", summary: "Cuộc thi thu hút sự tham gia của các Chi đoàn khối 10, 11, 12.", content: "Cuộc thi Rung chuông vàng diễn ra sôi nổi tại hội trường với nhiều phần thi hấp dẫn.", ago: 8 },
    { kind: "NEWS", title: "Hiến máu nhân đạo: lan tỏa nghĩa cử cao đẹp", summary: "Chương trình hiến máu tình nguyện thu hút đông đảo đoàn viên, giáo viên.", content: "Chương trình hiến máu nhân đạo là hoạt động thường niên của Đoàn trường.", ago: 20 },
    { kind: "PLAN", title: "Kế hoạch công tác Đoàn năm học 2026–2027", summary: "Định hướng hoạt động của Đoàn trường trong năm học mới.", content: "## Mục tiêu\n1. Nâng cao chất lượng sinh hoạt Chi đoàn\n2. Đẩy mạnh phong trào tình nguyện\n3. Tổ chức các hoạt động văn hóa, thể thao\n\n## Nhiệm vụ trọng tâm\n- Xây dựng Chi đoàn vững mạnh\n- Tuyên truyền an toàn giao thông", ago: 30 },
    { kind: "PLAN", title: "Kế hoạch tổ chức Hội thi Đoàn viên tài năng", summary: "Hội thi nhằm phát hiện và bồi dưỡng các đoàn viên có năng khiếu.", content: "Hội thi gồm các phần thi: văn nghệ, kiến thức, kỹ năng.", ago: 5 },
    { kind: "EVENT", title: "Hội thi Đoàn viên tài năng", summary: "Sân chơi dành cho đoàn viên toàn trường.", content: "Mời toàn thể đoàn viên tham dự và cổ vũ.", ago: 3, eventAt: new Date(now + 14 * DAY), eventLocation: "Hội trường trường THPT Sơn Hà" },
    { kind: "EVENT", title: "Tuyên truyền an toàn giao thông", summary: "Hoạt động tuyên truyền tại cổng trường.", content: "Đoàn viên tham gia hướng dẫn giao thông và phát tờ rơi.", ago: 1, eventAt: new Date(now + 6 * DAY), eventLocation: "Cổng trường" },
    { kind: "ANNOUNCEMENT", title: "Thông báo lịch sinh hoạt Chi đoàn tháng 10", summary: "Các Chi đoàn sinh hoạt định kỳ vào tuần cuối tháng.", content: "Các Chi đoàn sinh hoạt theo lịch của Ban chấp hành Đoàn trường. Bí thư Chi đoàn gửi biên bản về cho BCH Đoàn trường.", ago: 1 },
    { kind: "ANNOUNCEMENT", title: "Thông báo đăng ký tham gia Ngày Chủ nhật xanh", summary: "Đoàn viên đăng ký trên hệ thống quản lý Đoàn.", content: "Đoàn viên đăng nhập hệ thống, vào mục Hoạt động và đăng ký tham gia.", ago: 4 },
  ];
  for (const a of articles) {
    await db.article.create({ data: { kind: a.kind, title: `${DEMO_TAG}${a.title}`, slug: `${a.kind.toLowerCase()}-demo-${Math.random().toString(36).slice(2, 8)}`, summary: a.summary, content: a.content.replaceAll("\\n", "\n"), eventAt: a.eventAt, eventLocation: a.eventLocation, published: true, publishedAt: day(a.ago), authorId: admin.id } });
  }
  const intro: Record<string, [string, string]> = {
    "doan-truong": ["Đoàn trường", "## Giới thiệu chung\nĐoàn trường THPT Sơn Hà là tổ chức Đoàn cơ sở trực thuộc, tập hợp đoàn viên thanh niên của nhà trường.\n\n(Nội dung demo – hãy cập nhật trong mục Website công khai.)"],
    "bch-doan-truong": ["Ban chấp hành Đoàn trường", "## Ban chấp hành\n(Nội dung demo – cập nhật danh sách Ban chấp hành Đoàn trường.)"],
    "co-cau-to-chuc": ["Cơ cấu tổ chức", "## Cơ cấu\n- Ban chấp hành Đoàn trường\n- Các Chi đoàn khối 10, 11, 12\n\n(Nội dung demo.)"],
    "noi-quy": ["Nội quy", "## Nội quy sinh hoạt\n1. Đoàn viên tham gia sinh hoạt đầy đủ\n2. Chấp hành điều lệ Đoàn\n3. Tích cực tham gia hoạt động phong trào\n\n(Nội dung demo.)"],
  };
  for (const [slug, [title, content]] of Object.entries(intro)) await db.sitePage.create({ data: { slug, title, content: content.replaceAll("\\n", "\n"), updatedById: admin.id } });
  for (const d of depts) {
    await db.chapterReport.create({ data: { departmentId: d.id, createdById: d.secretaryId, title: `${DEMO_TAG}Báo cáo hoạt động tháng 9 – Chi đoàn ${d.name}`, content: "## Kết quả\n- Sinh hoạt Chi đoàn đúng định kỳ\n- Tham gia đầy đủ các hoạt động của Đoàn trường\n\n## Phương hướng\nTiếp tục duy trì nề nếp và đẩy mạnh phong trào.".replaceAll("\\n", "\n"), createdAt: day(5) } });
  }

  await db.auditLog.create({ data: { userId: admin.id, action: "seed.demo", target: "System", metadata: { note: "Nạp dữ liệu demo" } } });
  console.log(`✓ Demo: 1 admin, ${depts.length} chi đoàn, ${depts.length} bí thư, ${members.length} đoàn viên, ${created.length} hoạt động.`);
  console.log(`  Mật khẩu chung: ${DEMO_PASSWORD}  |  admin, bithu.10a1, SH20260001 …`);
}

// Chạy trực tiếp: `npm run db:seed`. Khi được import (bootstrap.ts) thì không tự chạy.
if (process.argv[1]?.endsWith("seed.ts")) {
  const remote = !/@(localhost|127\.0\.0\.1)[:/]|host=\//.test(process.env.DATABASE_URL ?? "");
  if ((process.env.NODE_ENV === "production" || remote) && process.env.SEED_CONFIRM !== "yes") {
    console.error("Từ chối: database này là production/từ xa, seed demo sẽ XÓA toàn bộ dữ liệu. Đặt SEED_CONFIRM=yes nếu bạn thật sự muốn.");
    process.exit(1);
  }
  seedDemo().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
}
