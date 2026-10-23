import "server-only";
import { cachedPublic } from "@/lib/cache";
import { db } from "@/lib/db";
import { plainText } from "@/lib/rich-html";
import { currentValue, resolvePeriod } from "@/lib/emulation-period";
import { emulationRanking } from "@/lib/services/emulation";
import { listPublicQuizzes } from "@/lib/services/games";
import { KIND_LABEL, articleHref, volunteerSchedule } from "@/lib/services/public";
import { loadCalendars } from "@/lib/services/school-calendar";
import { getSiteSettings } from "@/lib/services/site-settings";

/** Bài viết cũ hơn mốc này không đưa vào "tổng quan" và không được tìm cho chatbot (trừ khi vẫn đang diễn ra). */
export const CHAT_RECENT_DAYS = 120;

const TZ = "Asia/Ho_Chi_Minh";
const dmy = (d: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
const hm = (d: Date) => new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/**
 * Bức tranh tổng quan về mọi thông tin CÔNG KHAI của hệ thống, viết gọn để đưa cho chatbot cùng mỗi câu hỏi:
 * liên hệ, lịch công tác tuần này, tình nguyện, thi đua tuần, trò chơi đang mở, Chi đoàn, báo cáo Chi đoàn và danh mục bài viết gần đây.
 * Bài cũ quá CHAT_RECENT_DAYS ngày không đưa vào. Lưu đệm 2 phút để không truy vấn lại cho mỗi câu hỏi.
 */
export const publicFacts = cachedPublic("chatPublicFacts", async (): Promise<string> => {
  const now = new Date();
  const since = new Date(now.getTime() - CHAT_RECENT_DAYS * 86400_000);
  const calendars = await loadCalendars();
  const weekValue = currentValue("week", now, calendars);
  const period = resolvePeriod("week", weekValue, calendars)!;
  const m = weekValue.match(/^(\d{4})-T(\d+)$/)!;
  const out: string[] = [];

  const [settings, schedule, volunteers, ranking, quizzes, depts, reports, articles] = await Promise.all([
    getSiteSettings(),
    db.weeklySchedule.findFirst({ where: { startYear: +m[1], week: +m[2], published: true }, include: { items: { orderBy: [{ date: "asc" }, { sortOrder: "asc" }] } } }),
    volunteerSchedule(),
    emulationRanking(period),
    listPublicQuizzes(8),
    db.department.findMany({ where: { graduatedAt: null, isTeacher: false }, select: { name: true } }),
    db.chapterReport.findMany({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 12, include: { department: { select: { name: true } } } }),
    db.article.findMany({ where: { published: true, publishedAt: { gte: since, lte: now } }, orderBy: { publishedAt: "desc" }, take: 40, select: { title: true, slug: true, kind: true, publishedAt: true, eventAt: true } }),
  ]);

  out.push(`[Thông tin liên hệ] Địa chỉ: ${settings.address || "chưa cập nhật"}. Điện thoại: ${settings.phone || "chưa cập nhật"}. Email: ${settings.email || "chưa cập nhật"}.${settings.facebook ? ` Facebook: ${settings.facebook}.` : ""}${settings.youtube ? ` Youtube: ${settings.youtube}.` : ""}`);
  if (settings.countdownTitle && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(settings.countdownAt)) out.push(`[Sự kiện lớn sắp tới] ${settings.countdownTitle}, thời điểm ${settings.countdownAt.replace("T", " ")} (giờ Việt Nam).`);

  const grades = new Map<string, number>();
  for (const d of depts) { const g = d.name.match(/^(10|11|12)/)?.[1] ?? "Khác"; grades.set(g, (grades.get(g) ?? 0) + 1); }
  out.push(`[Chi đoàn] Trường có ${depts.length} Chi đoàn (mỗi lớp là một Chi đoàn): ${[...grades.entries()].sort().map(([g, n]) => `khối ${g}: ${n}`).join(", ")}. Danh sách: ${depts.map((d) => d.name).sort((a, b) => a.localeCompare(b, "vi", { numeric: true })).join(", ")}.`);

  if (schedule?.items.length) {
    out.push(`[Lịch công tác tuần ${m[2]} (${period.label.split(" · ")[0]})]\n` + schedule.items.map((i) => `- ${dmy(i.date)}${i.time ? ` ${i.time}` : ""}: ${i.content}${i.assignee ? ` (phụ trách: ${i.assignee})` : ""}${i.place ? `, tại ${i.place}` : ""}`).join("\n"));
  } else out.push(`[Lịch công tác tuần ${m[2]}] Chưa có lịch được công bố.`);

  const vol = volunteers.filter((v) => v.endAt >= new Date(now.getTime() - 3 * 86400_000)).slice(0, 15);
  out.push(vol.length
    ? "[Lịch tình nguyện của các lớp]\n" + vol.map((v) => `- ${dmy(v.startAt)} ${hm(v.startAt)}–${hm(v.endAt)}: Chi đoàn ${v.department?.name}, ${v.task}, tại ${v.location}${v.status === "COMPLETED" ? " (đã hoàn thành)" : ""}`).join("\n")
    : "[Lịch tình nguyện của các lớp] Hiện chưa có lớp nào đăng ký tình nguyện sắp tới.");

  const scored = ranking.filter((r) => r.total !== 0);
  out.push(scored.length
    ? `[Thi đua Chi đoàn ${period.label.split(" · ")[0]}] Xếp hạng theo điểm do Ban chấp hành ghi nhận (các lớp bằng điểm cùng hạng): ` + scored.slice(0, 30).map((r) => `hạng ${r.rank} Chi đoàn ${r.name} ${r.total} điểm`).join("; ") + "."
    : `[Thi đua Chi đoàn ${period.label.split(" · ")[0]}] Tuần này chưa có điểm thi đua.`);

  out.push(quizzes.length
    ? "[Trò chơi tích điểm đang mở] " + quizzes.map((q) => `"${q.title}" (${q._count.questions} câu, tối đa ${q.points} điểm, ${q.secondsPerQuestion} giây mỗi câu${q.endsAt ? `, đến ${dmy(q.endsAt)}` : ""})`).join("; ") + ". Cần đăng nhập mới chơi và tính điểm."
    : "[Trò chơi tích điểm] Hiện chưa có trò chơi nào đang mở.");

  if (reports.length) out.push("[Báo cáo Chi đoàn gần đây]\n" + reports.map((r) => `- ${dmy(r.createdAt)} · Chi đoàn ${r.department.name}: ${r.title} — ${plainText(r.content, 160)}`).join("\n"));

  out.push(`[Danh mục bài viết ${CHAT_RECENT_DAYS} ngày gần đây, mới nhất trước] (chỉ là mục lục; nội dung chi tiết nằm ở phần TÀI LIỆU nếu liên quan đến câu hỏi)\n` +
    articles.map((a) => `- ${KIND_LABEL[a.kind]} · ${a.publishedAt ? dmy(a.publishedAt) : ""}: ${a.title} (${articleHref(a.slug)})`).join("\n"));
  return out.join("\n\n");
}, 120);
