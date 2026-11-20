import type { ArticleKind } from "@prisma/client";
import type { MessageKey, TFn } from "./translate";

/** Nhãn loại bài theo ngôn ngữ (dùng được ở server và client). */
export const kindLabelT = (t: TFn, kind: ArticleKind) => t(`public.kind.${kind}` as MessageKey);
export const kindActionT = (t: TFn, kind: ArticleKind) => t(`misc.kindAction.${kind}` as MessageKey);
