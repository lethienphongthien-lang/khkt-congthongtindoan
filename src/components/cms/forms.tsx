"use client";
import { useT, useLocale } from "@/lib/i18n/client";
import { intlLocale } from "@/lib/i18n/format";
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
import { kindSlug } from "@/lib/services/kind";
import { kindActionT } from "@/lib/i18n/kind-labels";
import type { ArticleKind } from "@prisma/client";


type Errors = Record<string, string>;
/* t được truyền vào hàm */
const toErrors = (f?: Record<string, string[]>): Errors => Object.fromEntries(Object.entries(f ?? {}).map(([k, m]) => [k, m[0]]));

export function ArticleForm({ id, kind, initial, image, files, draftOnly, departments, categories }: {
  id?: string; /** Bí thư: chỉ lưu bản nháp, chờ Admin duyệt. */ draftOnly?: boolean; files?: AttachmentValue[]; kind: ArticleKind;
  /** Câu chuyện đẹp: danh sách Chi đoàn để Admin chọn (bí thư tự gắn Chi đoàn của mình). */ departments?: { id: string; name: string }[];
  /** Kế hoạch: danh mục để chọn (Admin thiết lập ở nút "Danh mục"). */ categories?: { id: string; name: string }[];
  initial?: { title: string; summary: string; content: string; eventAt: string; eventLocation: string; published: boolean; publishedAt?: string; departmentId?: string; categoryId?: string };
  image?: UploadedImage;
}) {
  const router = useRouter();
  const t = useT();
  const [v, setV] = useState({ departmentId: "", categoryId: "", publishedAt: "", ...(initial ?? { title: "", summary: "", content: "", eventAt: "", eventLocation: "", published: !draftOnly }) });
  // Ngày đăng mặc định là bây giờ (đặt sau khi trang mở để không lệch giờ giữa máy chủ và trình duyệt)
  useEffect(() => { setV((p) => (p.publishedAt ? p : { ...p, publishedAt: toLocalInput(new Date()) })); }, []);
  const [img, setImg] = useState<UploadedImage>(image ?? null);
  const [attachments, setAttachments] = useState<AttachmentValue[]>(files ?? []);
  const [aiContent, setAiContent] = useState({ html: "", n: 0 });
  const [aiWorking, setAiWorking] = useState<string | null>(null); // AI đang làm gì (khóa biểu mẫu + hiệu ứng)
  const [aiFilled, setAiFilled] = useState({ title: false, summary: false, content: false }); // ô nào do AI điền (bỏ dấu khi người dùng sửa)
  const AI_TAG = <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700"><Sparkles className="size-3" />{t("cms.f.aiTag")}</span>;
  const AI_RING = "border-violet-400 bg-violet-50/60 ring-1 ring-violet-300";
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });

  const missing = countPlaceholders(v.content) + countPlaceholders(v.title) + countPlaceholders(v.summary);

  async function submit() {
    if (missing > 0 && !window.confirm(t("cms.f.confirmBlanks", { n: missing }))) return;
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
      {draftOnly && <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark">{t("cms.f.draftNote")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <AiAssist kind={kind as "NEWS" | "PLAN" | "EVENT" | "ANNOUNCEMENT" | "STORY" | "CAREER" | "DOCUMENT"} title={v.title} content={v.content} onContent={(html) => { setV((p) => ({ ...p, content: html })); setAiContent((a) => ({ html, n: a.n + 1 })); setAiFilled((f) => ({ ...f, content: true })); }} onSummary={(text) => { setV((p) => ({ ...p, summary: text })); setAiFilled((f) => ({ ...f, summary: true })); }} onTitle={(text) => { setV((p) => ({ ...p, title: text })); setAiFilled((f) => ({ ...f, title: true })); }} summary={v.summary} onBusy={setAiWorking} />
        </div>
        {!draftOnly && <Field label={t("cms.f.status")}>
          <Select value={v.published ? "1" : "0"} onChange={(e) => setV({ ...v, published: e.target.value === "1" })}><option value="1">{t("cms.f.public")}</option><option value="0">{t("cms.f.draftHidden")}</option></Select>
        </Field>}
        <Field label={t("cms.f.publishDate")} error={errors.publishedAt} hint={v.publishedAt && fromLocalInput(v.publishedAt) > new Date() ? t("cms.f.scheduled") : t("cms.f.dateHint")}>
          <Input type="datetime-local" value={v.publishedAt} onChange={set("publishedAt")} />
        </Field>
        <Field label={t("cms.f.title")} required error={errors.title} className="sm:col-span-2" badge={aiFilled.title ? AI_TAG : undefined}><WrapInput className={aiFilled.title ? AI_RING : undefined} value={v.title} onChange={(e) => { set("title")(e); setAiFilled((f) => ({ ...f, title: false })); }} /></Field>
        {kind === "EVENT" && (
          <>
            <Field label={t("cms.f.eventTime")} required error={errors.eventAt}><Input type="datetime-local" value={v.eventAt} onChange={set("eventAt")} /></Field>
            <Field label={t("cms.f.location")} error={errors.eventLocation}><Input value={v.eventLocation} onChange={set("eventLocation")} /></Field>
          </>
        )}
        {categories && (
          <Field label={t("cms.f.category")} className="sm:col-span-2" hint={categories.length ? t("cms.f.catHint") : t("cms.f.catNone")}>
            <Select value={v.categoryId} onChange={set("categoryId")}><option value="">{t("cms.f.uncategorized")}</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          </Field>
        )}
        {kind === "STORY" && !draftOnly && (
          <Field label={t("cms.f.doingChapter")} error={errors.departmentId} className="sm:col-span-2">
            <Select value={v.departmentId} onChange={set("departmentId")}><option value="">{t("cms.f.noChapter")}</option>{(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          </Field>
        )}
        {kind === "STORY" && draftOnly && <p className="rounded-md bg-primary-light px-3 py-2 text-sm text-primary-dark sm:col-span-2">{t("cms.f.storyOwn")}</p>}
        <Field label={t("cms.f.summary")} error={errors.summary} className="sm:col-span-2" hint={t("cms.f.summaryHint")} badge={aiFilled.summary ? AI_TAG : undefined}><Textarea highlightPlaceholders className={`min-h-20 ${aiFilled.summary ? AI_RING : ""}`} value={v.summary} onChange={(e) => { set("summary")(e); setAiFilled((f) => ({ ...f, summary: false })); }} /></Field>
        <Field group label={t("cms.f.content")} required error={errors.content} className="sm:col-span-2" badge={aiFilled.content ? AI_TAG : undefined}>
          <div className="space-y-2">
            {missing > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                <span className="mt-0.5 inline-block size-2.5 shrink-0 rounded-full bg-yellow-400" />
                <span>{t("cms.f.blanksA")}<b>{missing}{t("cms.f.blanksB")}</b>{t("cms.f.blanksC")}<span className="rounded bg-yellow-200 px-1 font-semibold">[ghi rõ ...]</span>{t("cms.f.blanksD")}<b>{t("cms.f.blanksE")}</b>{t("cms.f.blanksF")}</span>
              </p>
            )}
            <div className={aiFilled.content ? "rounded-md ring-2 ring-violet-300" : undefined}>
            <RichEditor value={v.content} replaceWith={aiContent} onChange={(content) => { setV((p) => ({ ...p, content })); setAiFilled((f) => (f.content ? { ...f, content: false } : f)); }} />
            </div>
          </div>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field group label={t("cms.f.cover")} hint={t("cms.f.coverHint")}>
          <ImageUpload folder="activities" value={img} onChange={setImg} />
        </Field>
        <Field group label={t("cms.f.attachments")} hint={t("cms.f.attachmentsHint")}><FileUpload value={attachments} onChange={setAttachments} /></Field>
      </div>
      <HeaderActions>
        <Button loading={busy} onClick={submit}>{draftOnly ? t("cms.f.saveDraft") : id ? t("cms.c.saveChanges") : kindActionT(t, kind)}</Button>
        <Button variant="secondary" onClick={() => router.back()}>{t("cms.c.cancel")}</Button>
      </HeaderActions>
    </div>
  );
}

type SiteTab = { title: string; content: string; attachments: AttachmentValue[] };

/** Soạn trang giới thiệu: một nội dung duy nhất, hoặc chia thành nhiều tab (mỗi tab một tên và một nội dung riêng, ví dụ Nội quy Đoàn viên / Nội quy lớp). */
export function SitePageForm({ slug, title, initial, initialTabs = [], initialFiles = [] }: { slug: string; title: string; initial: string; initialTabs?: SiteTab[]; initialFiles?: AttachmentValue[] }) {
  const router = useRouter();
  const t = useT();
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
    if (!window.confirm(t("cms.f.confirmDelTab", { title: tabs[cur].title }))) return;
    const left = tabs.filter((_, j) => j !== cur);
    if (left.length === 0) { setContent(""); } // hết tab thì quay về một trang trống
    setTabs(left); setActive(Math.max(0, cur - 1));
  };
  const merge = () => { if (!window.confirm(t("cms.f.confirmMerge"))) return; setFiles(tabs.flatMap((t) => t.attachments).slice(0, 10)); setContent(tabs.map((t) => (tabs.length > 1 ? `<h2>${t.title.replace(/</g, "&lt;")}</h2>` : "") + t.content).join("")); setTabs([]); setActive(0); };

  return (
    <div className="w-full space-y-3">
      {!multi ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium">{t("cms.f.pageContent", { title })}</span>
            <Button variant="secondary" size="sm" onClick={() => { setTabs([{ title: "Nội dung", content, attachments: files }]); setFiles([]); setActive(0); }}><Plus className="size-3.5" />{t("cms.f.splitTabs")}</Button>
          </div>
          <RichEditor value={content} onChange={setContent} minHeight={384} />
          <Field group label={t("cms.f.attachments")} hint={t("cms.f.filesHint")}><FileUpload value={files} onChange={setFiles} /></Field>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-1 border-b border-border">
            {tabs.map((tb, i) => (
              <button key={i} type="button" onClick={() => setActive(i)} className={`-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-sm font-medium ${i === cur ? "border-border bg-white text-primary" : "border-transparent text-muted hover:text-foreground"}`}>{tb.title || t("cms.f.unnamed")}</button>
            ))}
            {tabs.length < 10 && <button type="button" onClick={addTab} className="mb-0.5 ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-primary hover:bg-primary-light"><Plus className="size-3.5" />{t("cms.f.addTab")}</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-60 flex-1 items-center gap-2 text-[13px] font-medium whitespace-nowrap">{t("cms.f.tabName")}<Input value={tabs[cur].title} maxLength={40} onChange={(e) => setTab(cur, { title: e.target.value })} /></label>
            <Button variant="secondary" size="sm" disabled={cur === 0} onClick={() => move(-1)} title={t("cms.f.moveLeftTitle")}>{t("cms.f.moveLeft")}</Button>
            <Button variant="secondary" size="sm" disabled={cur === tabs.length - 1} onClick={() => move(1)} title={t("cms.f.moveRightTitle")}>{t("cms.f.moveRight")}</Button>
            <Button variant="ghost" size="sm" className="text-danger" onClick={removeTab}>{t("cms.f.delTab")}</Button>
            <Button variant="ghost" size="sm" onClick={merge}>{t("cms.f.mergeTabs")}</Button>
          </div>
          <RichEditor key={cur} value={tabs[cur].content} onChange={(c) => setTab(cur, { content: c })} minHeight={384} />
          <Field group label={t("cms.f.tabFilesLabel", { title: tabs[cur].title })} hint={t("cms.f.tabFilesHint")}><FileUpload key={cur} value={tabs[cur].attachments} onChange={(a) => setTab(cur, { attachments: a })} /></Field>
        </>
      )}
      <HeaderActions>
        <Button loading={busy} onClick={async () => {
          if (multi && tabs.some((x) => !x.title.trim())) return void toast.error(t("cms.f.nameEveryTab"));
          setBusy(true); const res = await saveSitePageAction(slug, multi ? { content: "", tabs } : { content, attachments: files }); setBusy(false);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message); router.push("/cms/pages"); router.refresh();
        }}>{t("cms.f.savePage")}</Button>
        <Button variant="secondary" onClick={() => router.back()}>{t("cms.c.cancel")}</Button>
      </HeaderActions>
    </div>
  );
}

export function ReportForm({ id, departments, fixedDepartment, periods = [], defaultPeriodId, initial, image }: {
  id?: string; departments: { id: string; name: string }[]; fixedDepartment?: string;
  periods?: { id: string; title: string; status: string; endDate?: Date | string | null }[];
  defaultPeriodId?: string;
  initial?: { departmentId: string; title: string; content: string; periodId?: string | null; participantCount?: number | null }; image?: UploadedImage;
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [v, setV] = useState({
    departmentId: initial?.departmentId ?? "",
    periodId: initial?.periodId ?? defaultPeriodId ?? "",
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    participantCount: initial?.participantCount != null ? String(initial.participantCount) : "",
  });
  const [img, setImg] = useState<UploadedImage>(image ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("cms.f.chapter")} required error={errors.departmentId}>
          {fixedDepartment ? <Input value={fixedDepartment} disabled readOnly /> : (
            <Select value={v.departmentId} onChange={(e) => setV({ ...v, departmentId: e.target.value })}><option value="">{t("cms.f.pickChapter")}</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          )}
        </Field>
        <Field label={t("cms.f.period")} hint={t("cms.f.periodHint")} error={errors.periodId}>
          <Select value={v.periodId} onChange={(e) => {
            const pId = e.target.value;
            const p = periods.find((x) => x.id === pId);
            setV((prev) => ({
              ...prev,
              periodId: pId,
              title: prev.title || (p ? t("cms.f.periodTitle", { title: p.title }) : ""),
            }));
          }}>
            <option value="">{t("cms.f.noPeriod")}</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id} disabled={p.status === "CLOSED" && p.id !== initial?.periodId}>
                {p.title} {p.status === "CLOSED" ? t("cms.f.closed") : p.endDate ? t("cms.f.due", { date: new Date(p.endDate).toLocaleDateString(intlLocale(locale)) }) : ""}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("cms.f.participants")} required hint={t("cms.f.participantsHint")} error={errors.participantCount}><Input type="number" min={0} inputMode="numeric" value={v.participantCount} onChange={(e) => setV({ ...v, participantCount: e.target.value })} placeholder={t("cms.f.example38")} /></Field>
      <Field label={t("cms.f.reportTitle")} required error={errors.title}><WrapInput value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder={t("cms.f.reportTitleEx")} /></Field>
      <Field group label={t("cms.f.content")} required error={errors.content}><RichEditor value={v.content} onChange={(content) => setV((p) => ({ ...p, content }))} /></Field>
      <Field label={t("cms.f.illustration")}><ImageUpload folder="activities" value={img} onChange={setImg} /></Field>
      <HeaderActions>
        <Button loading={busy} onClick={async () => {
          setBusy(true); setErrors({});
          const res = await saveReportAction(id ?? null, { ...v, imageUrl: img?.imageUrl ?? "", imagePublicId: img?.publicId ?? "" });
          setBusy(false);
          if (!res.ok) { toast.error(res.error); setErrors(toErrors(res.fieldErrors)); return; }
          toast.success(res.message); router.push("/chapter-reports"); router.refresh();
        }}>{id ? t("cms.c.saveChanges") : t("cms.f.submitReport")}</Button>
        <Button variant="secondary" onClick={() => router.back()}>{t("cms.c.cancel")}</Button>
      </HeaderActions>
    </div>
  );
}
