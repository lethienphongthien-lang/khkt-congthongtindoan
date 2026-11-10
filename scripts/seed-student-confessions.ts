// node --env-file=.env --import tsx scripts/seed-student-confessions.ts [--apply]
// Generated content requested by the administrator; anonymous, with an audit manifest.
import assert from "node:assert/strict";
import { db } from "../src/lib/db";

const batch = "student-confessions-2026-11-10-v1";
const auditKey = `content.seed.${batch}`;
const posts = [
  {
    content: "Có ai ôn kiểm tra kiểu mình không, tối đọc bài thấy câu nào cũng quen, sáng nhận đề thấy câu nào cũng lạ 😭 Xong ra khỏi phòng mới nhớ cách làm. Não ơi mình cùng một đội mà?",
    comments: [
      "t còn nhớ đáp án lúc đang dắt xe về nữa cơ :)))",
      "Đọc thấy quen với tự làm được là hai chuyện khác nhau, t vừa được môn toán dạy cho bài đó",
      "Lần sau lấy đề cũ ra bấm giờ làm thử đi, ngồi đọc lời giải dễ tưởng mình hiểu lắm. T bị hoài",
    ],
  },
  {
    content: "Ra chơi có mấy phút mà phải chọn giữa xuống căn tin, đi vệ sinh với ngồi chép nốt bài. Chọn căn tin thì xếp hàng xong nghe chuông, chọn chép bài thì bụng kêu hết tiết sau. Đề nghị cho học sinh thêm một cái phân thân.",
    comments: [
      "t chọn ngồi tại chỗ vì lười xuống cầu thang, xong đói tới trưa",
      "Xuống căn tin gặp bạn đứng nói chuyện 5 phút là coi như mất lượt luôn =)))",
      "Mang bánh theo cứu đói đi, đừng để tiết cuối bụng trả lời thay mình",
    ],
  },
  {
    content: "Xin cách mở lời với bạn mình thích ngoài câu ‘cho mượn vở chép bài với’. Mượn nhiều tới mức giờ bạn đó thấy mình là tự đưa vở, chưa kịp nói gì luôn. Có khi trong mắt người ta mình chỉ là cái máy photocopy 😭",
    comments: [
      "Trả vở đúng hạn trước đã nha máy photocopy :)))",
      "Hỏi bạn làm bài kiểm tra được không rồi nói chuyện tiếp thôi, đừng chuẩn bị nguyên bài văn trong đầu",
    ],
  },
  {
    content: "Làm bài nhóm mới thấy câu ‘ừ để tối t làm’ có nhiều múi giờ ghê. Nhắn hỏi thì ai cũng online mà cái file vẫn trống. T không cần mọi người làm hay liền, chỉ cần báo đang làm tới đâu để khỏi ngồi đoán có phải mình ôm hết không 😭",
    comments: [
      "chia rõ mỗi đứa 1 phần kèm giờ nộp đi, nói chung chung là ai cũng tưởng người khác làm",
      "Có đứa đợi sát giờ mới hỏi ‘nhóm mình làm chủ đề gì ấy nhỉ’ mới sợ",
      "Từng là đứa nộp trễ nên đọc hơi nhột. Không kịp thì báo sớm một câu thật, đừng im luôn",
    ],
  },
  {
    content: "Không biết ai cũng vậy không chứ lúc đang học chỉ mong hết tiết, tới hôm đứa bạn thân nghỉ một bữa thì thấy ngày dài gấp đôi. Không có ai liếc nhau khi gặp câu khó, xuống căn tin cũng lười. Mai đi học lại giùm, t giữ cho một đống bài rồi đó :)))",
    comments: [
      "Bạn thân nghỉ = tự nhiên chăm nghe giảng hẳn vì không còn ai để nói chuyện 😭",
      "‘giữ cho một đống bài’ nghe cảm động được nửa câu đầu thôi",
      "Hôm t nghỉ bạn t chụp bài gửi đủ, nhưng chụp luôn cả đồ ăn nó mua để chọc tức nữa",
    ],
  },
];

async function main() {
  assert.equal(posts.length, 5);
  const commentsTotal = posts.reduce((s, p) => s + p.comments.length, 0);
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "preview", confessions: posts.length, anonymousComments: commentsTotal, posts }, null, 2));
    return;
  }
  const now = new Date();
  const ids = posts.map((_, i) => `${batch}-${i + 1}`);
  await db.$transaction(async (tx) => {
    assert(!await tx.siteSetting.findUnique({ where: { key: auditKey } }), "Đợt nội dung này đã được thêm; không tạo trùng.");
    for (const [i, post] of posts.entries()) {
      const createdAt = new Date(now.getTime() - (posts.length - i) * 8 * 60_000);
      await tx.confession.create({ data: {
        id: ids[i], content: post.content, nickname: null, status: "APPROVED", createdAt,
        reviewedAt: new Date(createdAt.getTime() + 60_000),
        comments: { create: post.comments.map((content, j) => ({
          id: `${ids[i]}-comment-${j + 1}`, userId: null, authorName: "Ẩn danh", content,
          createdAt: new Date(createdAt.getTime() + (j + 1) * 2 * 60_000),
        })) },
      } });
    }
    await tx.siteSetting.create({ data: { key: auditKey, value: JSON.stringify({ origin: "generated-content", requestedBy: "administrator", createdAt: now.toISOString(), confessionIds: ids, anonymousComments: commentsTotal, posts }) } });
  }, { timeout: 60_000, isolationLevel: "Serializable" });
  const saved = await db.confession.findMany({ where: { id: { in: ids } }, include: { comments: true } });
  assert.equal(saved.length, 5);
  assert(saved.every((p) => p.status === "APPROVED" && p.nickname === null));
  assert.equal(saved.reduce((s, p) => s + p.comments.length, 0), commentsTotal);
  assert(saved.every((p) => p.comments.every((c) => c.userId === null && c.authorName === "Ẩn danh" && c.createdAt <= now)));
  console.log(JSON.stringify({ mode: "applied-and-verified", approvedConfessions: saved.length, anonymousComments: commentsTotal, auditKey }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
