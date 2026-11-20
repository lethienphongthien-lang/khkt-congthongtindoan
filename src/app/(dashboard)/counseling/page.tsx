import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ClickRow } from "@/components/ui/click-row";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { formatDateTime, pageParam, str } from "@/utils";
import { CompactList } from "@/components/ui/compact-list";
import { FilterBar } from "@/components/ui/filter-bar";
import { DataTable, EmptyState, PageHeader, Pagination, StatusBadge, Td, Th } from "@/components/ui/misc";
import type { MessageKey } from "@/lib/i18n/translate";
import { FEEDBACK_STATUS } from "@/components/feedback/status";
import { HeartHandshake, ShieldCheck } from "lucide-react";

export async function generateMetadata() { return { title: (await getT())("cms.counsel.title") }; }
const PAGE_SIZE = 12;

export default async function CounselingListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getT();
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = str(sp.status);
  const page = pageParam(sp.page);

  const where: Prisma.FeedbackWhereInput = {
    category: "TƯ VẤN TÂM LÝ",
    ...(status && status in FEEDBACK_STATUS ? { status: status as keyof typeof FEEDBACK_STATUS } : {}),
  };

  const [items, total, unread] = await Promise.all([
    db.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.feedback.count({ where }),
    db.feedback.count({ where: { category: "TƯ VẤN TÂM LÝ", status: "NEW" } }),
  ]);

  const badge = (s: keyof typeof FEEDBACK_STATUS) => (
    <StatusBadge tone={FEEDBACK_STATUS[s].tone}>{t(`community.fas.${s}` as MessageKey)}</StatusBadge>
  );

  return (
    <>
      <PageHeader
        title={t("cms.counsel.title")}
        description={t("cms.counsel.desc", { n: unread })}
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-800">
        <ShieldCheck className="size-4 shrink-0 text-blue-600" />
        <span>
          {t("cms.counsel.notice")}
        </span>
      </div>

      <FilterBar
        fields={[
          {
            type: "select",
            name: "status",
            label: t("cms.feedback.allStatus"),
            options: Object.entries(FEEDBACK_STATUS).map(([value, v]) => ({ value, label: t(`community.fas.${value}` as MessageKey) })),
          },
        ]}
      />

      {items.length === 0 ? (
        <div className="rounded-lg border border-border bg-white/85">
          <EmptyState
            title={t("cms.counsel.emptyTitle")}
            description={t("cms.counsel.emptyDesc")}
          />
        </div>
      ) : (
        <>
          <CompactList
            items={items.map((f) => ({
              id: f.id,
              title: f.content,
              subtitle: `${f.contact ?? t("cms.counsel.anon")} · ${formatDateTime(f.createdAt)}`,
              badge: badge(f.status),
              href: `/counseling/${f.id}`,
            }))}
          />

          <div className="max-sm:hidden">
            <DataTable>
              <thead>
                <tr>
                  <Th>{t("cms.counsel.thContent")}</Th>
                  <Th>{t("cms.counsel.thContact")}</Th>
                  <Th>{t("cms.counsel.thSent")}</Th>
                  <Th>{t("cms.feedback.thStatus")}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <ClickRow key={f.id} href={`/counseling/${f.id}`}>
                    <Td className="max-w-xl">
                      <Link
                        href={`/counseling/${f.id}`}
                        className={`line-clamp-2 hover:text-primary ${f.status === "NEW" ? "font-semibold text-slate-900" : "text-slate-700"}`}
                      >
                        {f.content}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-medium text-slate-700">
                      {f.contact ?? <span className="text-muted italic">{t("cms.counsel.anon")}</span>}
                    </Td>
                    <Td className="whitespace-nowrap">{formatDateTime(f.createdAt)}</Td>
                    <Td>{badge(f.status)}</Td>
                  </ClickRow>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/counseling" params={{ status }} />
    </>
  );
}

