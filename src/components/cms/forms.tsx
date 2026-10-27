"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
import { saveArticleAction, saveSitePageAction } from "@/actions/cms";
import { saveReportAction } from "@/actions/chapter-reports";
import { HeaderActions } from "@/components/ui/header-actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, WrapInput } from "@/components/ui/form";
import { RichEditor } from "@/components/ui/rich-editor";
import { AiAssist, AiWorkingOverlay } from "@/components/cms/ai-assist";
import { ImageUpload, type UploadedImage } from "@/components/ui/image-upload";
import { FileUpload, type AttachmentValue } from "@/components/ui/file-upload";
import { fromLocalInput, toLocalInput } from "@/utils";
import { countPlaceholders } from "@/lib/rich-html";
import { KIND_ACTION, kindSlug } from "@/lib/services/kind";
import type { ArticleKind } from "@prisma/client";


type Errors = Record<string, string>;
const toErrors = (f?: Record<string, string[]>): Errors => Object.fromEntries(Object.entries(f ?? {}).map(([k, m]) => [k, m[0]]));

export function ArticleForm({ id, kind, initial, image, files, draftOnly, departments, categories }: {
  id?: string; /** Bí thư: chỉ lưu bản nháp, chờ Admin duyệt. */ draftOnly?: boolean; files?: AttachmentValue[]; kind: ArticleKind;
  /** Câu chuyện đẹp: danh sách Chi đoàn để Admin chọn (bí thư tự gắn Chi đoàn của mình). */ departments?: { id: string; name: string }[];
  /** Kế hoạch: danh mục để chọn (Admin thiết lập ở nút "Danh mục"). */ categories?: { id: string; name: string }[];
  initial?: { title: string; summary: string; content: string; eventAt: string; eventLocation: string; published: boolean; publishedAt?: string; departmentId?: string; categoryId?: string };
  image?: UploadedImage;
}) {
  const router = useRouter();
  const [v, setV] = useState({ departmentId: "", categoryId: "", publishedAt: "", ...(initial ?? { title: "", summary: "", content: "", eventAt: "", eventLocation: "", published: !draftOnly }) });
  // Ngày đăng mặc định là bây giờ (đặt sau khi trang mở để không lệch giờ giữa máy chủ và trình duyệt)
  useEffect(() => { setV((p) => (p.publishedAt ? p : { ...p, publishedAt: toLocalInput(new Date()) })); }, []);
  const [img, setImg] = useState<UploadedImage>(image ?? null);
  const [attachments, setAttachments] = useState<AttachmentValue[]>(files ?? []);
  const [aiContent, setAiContent] = useState({ html: "", n: 0 });
  const [aiWorking, setAiWorking] = useState<string | null>(null); // AI đang làm gì (khóa biểu mẫu + hiệu ứng)
  const [aiFilled, setAiFilled] = useState({ title: false, summary: false, content: false }); // ô nào do AI điền (bỏ dấu khi người dùng sửa)
  const AI_TAG = <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700"><Sparkles className="size-3" />AI viết · hãy kiểm tra</span>;
  const AI_RING = "border-violet-400 bg-violet-50/60 ring-1 ring-violet-300";
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const missing = countPlaceholders(v.content) + countPlaceholders(v.title) + countPlaceholders(v.summary);

  async function submit() {
    if (missing > 0 && !window.confirm(`Bài còn ${missing} chỗ dạng [ghi rõ ...] chưa điền (đang tô vàng). Vẫn đăng bài này?`)) return;
    setBusy(true); setErrors({});
    const res = await saveArticleAction(id ?? null, {
      ...v, kind, eventAt: v.eventAt ? fromLocalInput(v.eventAt).toISOString() : "", publishedAt: v.publishedAt ? fromLocalInput(v.publishedAt).toISOString() : "", coverUrl: img?.imageUrl ?? "", coverPublicId: img?.publicId ?? "", attachments,
    });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); setErrors(toErrors(res.fieldErrors)); return; }
    toast.success(res.message);
    router.push(`/cms/${kindSlug(kind)}`); router.refresh();
  }

  return (
    <div className="relative w-full space-y-4" aria-busy={!!aiWorking}>
      {aiWorking && <AiWorkingOverlay label={aiWorking} />}
      {draftOnly && <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark">Bài viết được lưu ở dạng bản nháp. Admin sẽ xem và duyệt trước khi hiển thị trên trang công khai.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AiAssist kind={kind as "NEWS" | "PLAN" | "EVENT" | "ANNOUNCEMENT" | "STORY" | "CAREER" | "DOCUMENT"} title={v.title} content={v.content} onContent={(html) => { setV((p) => ({ ...p, content: html })); setAiContent((a) => ({ html, n: a.n + 1 })); setAiFilled((f) => ({ ...f, content: true })); }} onSummary={(text) => { setV((p) => ({ ...p, summary: text })); setAiFilled((f) => ({ ...f, summary: true })); }} onTitle={(text) => { setV((p) => ({ ...p, title: text })); setAiFilled((f) => ({ ...f, title: true })); }} summary={v.summary} onBusy={setAiWorking} />
        </div>
        {!draftOnly && <Field label="Trạng thái">
          <Select value={v.published ? "1" : "0"} onChange={(e) => setV({ ...v, published: e.target.value === "1" })}><option value="1">Hiển thị công khai</option><option value="0">Bản nháp (ẩn)</option></Select>
        </Field>}
        <Field label="Ngày đăng" error={errors.publishedAt} hint={v.publishedAt && fromLocalInput(v.publishedAt) > new Date() ? "Hẹn giờ: bài chỉ hiện trên trang công khai từ thời điểm này." : "Mặc định là bây giờ. Đổi để ghi ngày đăng khác (ngày tương lai = hẹn giờ)."}>
          <Input type="datetime-local" value={v.publishedAt} onChange={set("publishedAt")} />
        </Field>
        <Field label="Tiêu đề" required error={errors.title} className="sm:col-span-2" badge={aiFilled.title ? AI_TAG : undefined}><WrapInput className={aiFilled.title ? AI_RING : undefined} value={v.title} onChange={(e) => { set("title")(e); setAiFilled((f) => ({ ...f, title: false })); }} /></Field>
        {kind === "EVENT" && (
          <>
            <Field label="Thời gian diễn ra" required error={errors.eventAt}><Input type="datetime-local" value={v.eventAt} onChange={set("eventAt")} /></Field>
            <Field label="Địa điểm" error={errors.eventLocation}><Input value={v.eventLocation} onChange={set("eventLocation")} /></Field>
          </>
        )}
        {categories && (
          <Field label="Danh mục" className="sm:col-span-2" hint={categories.length ? "Phân loại kế hoạch; trang công khai lọc theo danh mục." : "Chưa có danh mục. Admin tạo ở nút “Danh mục” trong trang Kế hoạch."}>
            <Select value={v.categoryId} onChange={set("categoryId")}><option value="">Chưa phân loại</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Field>
        )}
        {kind === "STORY" && !draftOnly && (
          <Field label="Chi đoàn thực hiện" error={errors.departmentId} className="sm:col-span-2">
            <Select value={v.departmentId} onChange={set("departmentId")}><option value="">Không gắn Chi đoàn cụ thể</option>{(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          </Field>
        )}
        {kind === "STORY" && draftOnly && <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark sm:col-span-2">Câu chuyện sẽ được gắn với Chi đoàn của bạn.</p>}
        <Field label="Tóm tắt" error={errors.summary} className="sm:col-span-2" hint="Hiện ở danh sách và trang chủ" badge={aiFilled.summary ? AI_TAG : undefined}><Textarea highlightPlaceholders className={`min-h-20 ${aiFilled.summary ? AI_RING : ""}`} value={v.summary} onChange={(e) => { set("summary")(e); setAiFilled((f) => ({ ...f, summary: false })); }} /></Field>
        <Field group label="Nội dung" required error={errors.content} className="sm:col-span-2" badge={aiFilled.content ? AI_TAG : undefined}>
          <div className="space-y-2">
            {missing > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                <span className="mt-0.5 inline-block size-2.5 shrink-0 rounded-full bg-yellow-400" />
                <span>Còn <b>{missing} chỗ</b> dạng <span className="rounded bg-yellow-200 px-1 font-semibold">[ghi rõ ...]</span> cần bạn điền (AI không tự bịa số liệu, ngày giờ, tên). Các chỗ này đang <b>tô vàng</b> trong nội dung.</span>
              </p>
            )}
            <div className={aiFilled.content ? "rounded-md ring-2 ring-violet-300" : undefined}>
            <RichEditor value={v.content} replaceWith={aiContent} onChange={(content) => { setV((p) => ({ ...p, content })); setAiFilled((f) => (f.content ? { ...f, content: false } : f)); }} />
            </div>
          </div>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field group label="Ảnh bìa" hint="Hiện ở danh sách bài và đầu trang bài viết.">
          <ImageUpload folder="activities" value={img} onChange={setImg} />
        </Field>
        <Field group label="Tệp đính kèm" hint="Người xem có thể xem trực tiếp hoặc tải về"><FileUpload value={attachments} onChange={setAttachments} /></Field>
      </div>
      <HeaderActions>
        <Button loading={busy} onClick={submit}>{draftOnly ? "Lưu bản nháp" : id ? "Lưu thay đổi" : KIND_ACTION[kind]}</Button>
        <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
      </HeaderActions>
    </div>
  );
}

type SiteTab = { title: string; content: string; attachments: AttachmentValue[] };

/** Soạn trang giới thiệu: một nội dung duy nhất, hoặc chia thành nhiều tab (mỗi tab một tên và một nội dung riêng, ví dụ Nội quy Đoàn viên / Nội quy lớp). */
export function SitePageForm({ slug, title, initial, initialTabs = [], initialFiles = [] }: { slug: string; title: string; initial: string; initialTabs?: SiteTab[]; initialFiles?: AttachmentValue[] }) {
  const router = useRouter();
  const [content, setContent] = useState(initial);
  const [files, setFiles] = useState<AttachmentValue[]>(initialFiles);
  const [tabs, setTabs] = useState<SiteTab[]>(initialTabs);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const multi = tabs.length > 0;
  const cur = Math.min(active, Math.max(0, tabs.length - 1));
  const setTab = (i: number, patch: Partial<SiteTab>) => setTabs((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (d: number) => setTabs((t) => { const j = cur + d; if (j < 0 || j >= t.length) return t; const a = [...t]; [a[cur], a[j]] = [a[j], a[cur]]; setActive(j); return a; });
  const addTab = () => { setTabs((t) => [...t, { title: `Tab ${t.length + 1}`, content: "", attachments: [] }]); setActive(tabs.length); };
  const removeTab = () => {
    if (!window.confirm(`Xóa tab “${tabs[cur].title}” và toàn bộ nội dung của nó?`)) return;
    const left = tabs.filter((_, j) => j !== cur);
    if (left.length === 0) { setContent(""); } // hết tab thì quay về một trang trống
    setTabs(left); setActive(Math.max(0, cur - 1));
  };
  const merge = () => { if (!window.confirm("Gộp tất cả tab thành một trang duy nhất (nội dung các tab nối lại theo thứ tự)?")) return; setFiles(tabs.flatMap((t) => t.attachments).slice(0, 10)); setContent(tabs.map((t) => (tabs.length > 1 ? `<h2>${t.title.replace(/</g, "&lt;")}</h2>` : "") + t.content).join("")); setTabs([]); setActive(0); };

  return (
    <div className="w-full space-y-3">
      {!multi ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium">{`Nội dung trang “${title}”`}</span>
            <Button variant="secondary" size="sm" onClick={() => { setTabs([{ title: "Nội dung", content, attachments: files }]); setFiles([]); setActive(0); }}><Plus className="size-3.5" />Chia thành nhiều tab</Button>
          </div>
          <RichEditor value={content} onChange={setContent} minHeight={384} />
          <Field group label="Tệp đính kèm" hint="PDF, Word, Excel, PowerPoint. Người xem có thể xem trực tiếp hoặc tải về"><FileUpload value={files} onChange={setFiles} /></Field>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-1 border-b border-border">
            {tabs.map((t, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} className={`-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-sm font-medium ${i === cur ? "border-border bg-white text-primary" : "border-transparent text-muted hover:text-foreground"}`}>{t.title || "(chưa đặt tên)"}</button>
            ))}
            {tabs.length < 10 && <button type="button" onClick={addTab} className="mb-0.5 ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-primary hover:bg-primary-light"><Plus className="size-3.5" />Thêm tab</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-60 flex-1 items-center gap-2 text-[13px] font-medium whitespace-nowrap">Tên tab<Input value={tabs[cur].title} maxLength={40} onChange={(e) => setTab(cur, { title: e.target.value })} /></label>
            <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => move(-1)} title="Chuyển tab sang trái">← Trái</Button>
            <Button variant="secondary" size="sm" disabled={cur === tabs.length - 1} onClick={() => move(1)} title="Chuyển tab sang phải">Phải →</Button>
            <Button variant="ghost" size="sm" className="text-danger" onClick={removeTab}>Xóa tab</Button>
            <Button variant="ghost" size="sm" onClick={merge}>Gộp lại một trang</Button>
          </div>
          <RichEditor key={cur} value={tabs[cur].content} onChange={(c) => setTab(cur, { content: c })} minHeight={384} />
          <Field group label={`Tệp đính kèm của tab “${tabs[cur].title}”`} hint="PDF, Word, Excel, PowerPoint. Mỗi tab có danh sách tệp riêng"><FileUpload key={cur} value={tabs[cur].attachments} onChange={(a) => setTab(cur, { attachments: a })} /></Field>
        </>
      )}
      <HeaderActions>
        <Button loading={busy} onClick={async () => {
          if (multi && tabs.some((t) => !t.title.trim())) return void toast.error("Hãy đặt tên cho mọi tab");
          setBusy(true); const res = await saveSitePageAction(slug, multi ? { content: "", tabs } : { content, attachments: files }); setBusy(false);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message); router.push("/cms/pages"); router.refresh();
        }}>Lưu trang</Button>
        <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
      </HeaderActions>
    </div>
  );
}

export function ReportForm({ id, departments, fixedDepartment, periods = [], defaultPeriodId, initial, image }: {
  id?: string; departments: { id: string; name: string }[]; fixedDepartment?: string;
  periods?: { id: string; title: string; status: string; endDate?: Date | string | null }[];
  defaultPeriodId?: string;
  initial?: { departmentId: string; title: string; content: string; periodId?: string | null }; image?: UploadedImage;
}) {
  const router = useRouter();
  const [v, setV] = useState({
    departmentId: initial?.departmentId ?? "",
    periodId: initial?.periodId ?? defaultPeriodId ?? "",
    title: initial?.title ?? "",
    content: initial?.content ?? "",
  });
  const [img, setImg] = useState<UploadedImage>(image ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Chi đoàn" required error={errors.departmentId}>
          {fixedDepartment ? <Input value={fixedDepartment} disabled readOnly /> : (
            <Select value={v.departmentId} onChange={(e) => setV({ ...v, departmentId: e.target.value })}><option value="">Chọn Chi đoàn</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          )}
        </Field>
        <Field label="Đợt báo cáo" hint="Chọn đợt báo cáo theo yêu cầu của BCH (nếu có)" error={errors.periodId}>
          <Select value={v.periodId} onChange={(e) => {
            const pId = e.target.value;
            const p = periods.find((x) => x.id === pId);
            setV((prev) => ({
              ...prev,
              periodId: pId,
              title: prev.title || (p ? `Báo cáo ${p.title}` : ""),
            }));
          }}>
            <option value="">(Không chọn đợt - Báo cáo thường xuyên/định kỳ)</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id} disabled={p.status === "CLOSED" && p.id !== initial?.periodId}>
                {p.title} {p.status === "CLOSED" ? "— [Đã đóng]" : p.endDate ? `— [Hạn: ${new Date(p.endDate).toLocaleDateString("vi-VN")}]` : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Tiêu đề báo cáo" required error={errors.title}><WrapInput value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Ví dụ: Báo cáo hoạt động công tác Đoàn tháng 10/2026" /></Field>
      <Field group label="Nội dung" required error={errors.content}><RichEditor value={v.content} onChange={(content) => setV((p) => ({ ...p, content }))} /></Field>
      <Field label="Ảnh minh họa"><ImageUpload folder="activities" value={img} onChange={setImg} /></Field>
      <HeaderActions>
        <Button loading={busy} onClick={async () => {
          setBusy(true); setErrors({});
          const res = await saveReportAction(id ?? null, { ...v, imageUrl: img?.imageUrl ?? "", imagePublicId: img?.publicId ?? "" });
          setBusy(false);
          if (!res.ok) { toast.error(res.error); setErrors(toErrors(res.fieldErrors)); return; }
          toast.success(res.message); router.push("/chapter-reports"); router.refresh();
        }}>{id ? "Lưu thay đổi" : "Nộp báo cáo"}</Button>
        <Button variant="secondary" onClick={() => router.back()}>Hủy</Button>
      </HeaderActions>
    </div>
  );
}
