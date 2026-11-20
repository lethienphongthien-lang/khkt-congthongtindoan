"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Placeholder from "@tiptap/extension-placeholder";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser, Highlighter, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Strikethrough, Table2, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/utils";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { PLACEHOLDER_RE, legacyToHtml } from "@/lib/rich-html";

/** Tô vàng các chỗ "[ghi rõ ...]" để người soạn không bỏ sót (chỉ hiển thị, không lưu vào nội dung). */
const PlaceholderHighlight = Extension.create({
  name: "placeholderHighlight",
  addProseMirrorPlugins() {
    return [new Plugin({
      props: {
        decorations: (state) => {
          const decos: Decoration[] = [];
          state.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            for (const m of node.text.matchAll(PLACEHOLDER_RE)) decos.push(Decoration.inline(pos + m.index!, pos + m.index! + m[0].length, { class: "ai-fill" }));
          });
          return DecorationSet.create(state.doc, decos);
        },
      },
    })];
  },
});

/** Tải ảnh lên Cloudinary qua API server; trả về đường dẫn ảnh. */
async function uploadImage(file: File, failMsg: string): Promise<string> {
  const fd = new FormData(); fd.set("file", file); fd.set("folder", "activities");
  const res = await fetch("/api/upload", { method: "POST", body: fd }); const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? failMsg);
  return json.imageUrl as string;
}

const sep = <span className="mx-1 h-5 w-px shrink-0 bg-border" />;

function Btn({ title, active, disabled, onClick, children }: { title: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} aria-label={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-sm text-slate-700 hover:bg-slate-200 disabled:opacity-30", active && "bg-primary-light text-primary")}>
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : e.isActive("heading", { level: 4 }) ? "h4" : "p",
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"), highlight: e.isActive("highlight"),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"), link: e.isActive("link"), table: e.isActive("table"),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }), justify: e.isActive({ textAlign: "justify" }),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "#0f172a", canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(t("ui.re.linkPrompt"), prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return void c().extendMarkRange("link").unsetLink().run();
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url.trim())) return void toast.error(t("ui.re.linkBad"));
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try { c().setImage({ src: await uploadImage(file, t("ui.uploadImgFail")), alt: "" }).run(); }
    catch (e) { toast.error(e instanceof Error ? e.message : t("ui.uploadImgFail")); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-slate-50 px-1.5 py-1">
      <Btn title={t("ui.re.undo")} disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className="size-4" /></Btn>
      <Btn title={t("ui.re.redo")} disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className="size-4" /></Btn>
      {sep}
      <select aria-label={t("ui.re.blockType")} value={s.block} className="h-8 rounded-sm border border-border bg-white px-1.5 text-[13px]"
        onChange={(e) => { const v = e.target.value; if (v === "p") c().setParagraph().run(); else c().setHeading({ level: Number(v[1]) as 2 | 3 | 4 }).run(); }}>
        <option value="p">{t("ui.re.p")}</option><option value="h2">{t("ui.re.h2")}</option><option value="h3">{t("ui.re.h3")}</option><option value="h4">{t("ui.re.h4")}</option>
      </select>
      {sep}
      <Btn title={t("ui.re.bold")} active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="size-4" /></Btn>
      <Btn title={t("ui.re.italic")} active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="size-4" /></Btn>
      <Btn title={t("ui.re.underline")} active={s.underline} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="size-4" /></Btn>
      <Btn title={t("ui.re.strike")} active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough className="size-4" /></Btn>
      <label title={t("ui.re.color")} className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-slate-200">
        <span className="text-[15px] leading-none font-bold" style={{ color: s.color }}>A</span>
        <span className="absolute bottom-1 h-0.5 w-4 rounded" style={{ background: s.color }} />
        <input type="color" value={s.color.startsWith("#") ? s.color : "#0f172a"} onChange={(e) => c().setColor(e.target.value).run()} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <Btn title={t("ui.re.highlight")} active={s.highlight} onClick={() => c().toggleHighlight({ color: "#fff3a3" }).run()}><Highlighter className="size-4" /></Btn>
      {sep}
      <Btn title={t("ui.re.left")} active={s.left} onClick={() => c().setTextAlign("left").run()}><AlignLeft className="size-4" /></Btn>
      <Btn title={t("ui.re.center")} active={s.center} onClick={() => c().setTextAlign("center").run()}><AlignCenter className="size-4" /></Btn>
      <Btn title={t("ui.re.right")} active={s.right} onClick={() => c().setTextAlign("right").run()}><AlignRight className="size-4" /></Btn>
      <Btn title={t("ui.re.justify")} active={s.justify} onClick={() => c().setTextAlign("justify").run()}><AlignJustify className="size-4" /></Btn>
      {sep}
      <Btn title={t("ui.re.ul")} active={s.ul} onClick={() => c().toggleBulletList().run()}><List className="size-4" /></Btn>
      <Btn title={t("ui.re.ol")} active={s.ol} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
      <Btn title={t("ui.re.quote")} active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className="size-4" /></Btn>
      <Btn title={t("ui.re.hr")} onClick={() => c().setHorizontalRule().run()}><Minus className="size-4" /></Btn>
      {sep}
      <Btn title={t("ui.re.link")} active={s.link} onClick={setLink}><Link2 className="size-4" /></Btn>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickImage(e.target.files?.[0])} />
      <Btn title={t("ui.re.image")} disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus className={cn("size-4", busy && "animate-pulse")} /></Btn>
      <Btn title={t("ui.re.table")} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 className="size-4" /></Btn>
      <Btn title={t("ui.re.clear")} onClick={() => c().unsetAllMarks().clearNodes().run()}><Eraser className="size-4" /></Btn>
      {s.table && (
        <div className="flex basis-full flex-wrap items-center gap-1 border-t border-border pt-1 text-[12px]">
          <span className="px-1 text-muted">{t("ui.re.tableLabel")}</span>
          {([[t("ui.re.rowBefore"), () => c().addRowBefore().run()], [t("ui.re.rowAfter"), () => c().addRowAfter().run()], [t("ui.re.delRow"), () => c().deleteRow().run()], [t("ui.re.colBefore"), () => c().addColumnBefore().run()], [t("ui.re.colAfter"), () => c().addColumnAfter().run()], [t("ui.re.delCol"), () => c().deleteColumn().run()], [t("ui.re.merge"), () => c().mergeOrSplit().run()], [t("ui.re.delTable"), () => c().deleteTable().run()]] as [string, () => void][]).map(([l, f]) => (
            <button key={l} type="button" onMouseDown={(e) => e.preventDefault()} onClick={f} className="rounded-sm border border-border bg-white px-2 py-1 hover:bg-slate-100">{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Trình soạn thảo kiểu Word: định dạng bằng thanh công cụ, lưu dưới dạng HTML đã được làm sạch ở server. */
export function RichEditor({ value, onChange, minHeight = 320, placeholder, replaceWith }: { value: string; onChange: (html: string) => void; minHeight?: number; placeholder?: string; /** Đẩy nội dung mới vào trình soạn (mỗi lần `n` đổi). Hoàn tác được bằng nút Hoàn tác. */ replaceWith?: { html: string; n: number } }) {
  const t = useT();
  const ref = useRef<Editor | null>(null);
  const insertFiles = (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return false;
    imgs.forEach((f) => uploadImage(f, t("ui.uploadImgFail")).then((src) => ref.current?.chain().focus().setImage({ src, alt: "" }).run()).catch((e) => toast.error(e instanceof Error ? e.message : t("ui.uploadImgFail"))));
    return true;
  };
  const lastN = useRef(replaceWith?.n ?? 0);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }), TextStyleKit.configure({ fontFamily: false, fontSize: false, lineHeight: false }),
      Highlight.configure({ multicolor: true }), PlaceholderHighlight,
      // Kéo góc ảnh để đổi kích thước (giữ tỉ lệ); kéo đường kẻ giữa các cột của bảng để đổi độ rộng cột
      Image.configure({ resize: { enabled: true, directions: ["top-left", "top-right", "bottom-left", "bottom-right"], minWidth: 60, minHeight: 40, alwaysPreserveAspectRatio: true } }),
      TableKit.configure({ table: { resizable: true, cellMinWidth: 60 } }), Placeholder.configure({ placeholder: placeholder ?? t("ui.re.placeholder") }),
    ],
    content: legacyToHtml(value),
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
    editorProps: {
      handlePaste: (_v, e) => insertFiles([...(e.clipboardData?.files ?? [])]),
      handleDrop: (_v, e) => insertFiles([...((e as DragEvent).dataTransfer?.files ?? [])]),
      attributes: { class: "prose-doan rich-editor px-4 py-3 outline-none", style: `min-height:${minHeight}px` } },
  });
  ref.current = editor;
  useEffect(() => {
    if (!editor || !replaceWith || replaceWith.n === lastN.current) return;
    lastN.current = replaceWith.n;
    editor.commands.setContent(replaceWith.html, { emitUpdate: false });
  }, [editor, replaceWith]);
  if (!editor) return <div className="rounded-md border border-border bg-white" style={{ minHeight: minHeight + 44 }} />;
  return (
    <div className="rounded-md border border-border bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
