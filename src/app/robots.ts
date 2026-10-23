import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/** Cho phép công cụ tìm kiếm lập chỉ mục cổng công khai; chặn khu quản trị, đăng nhập và API. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/login", "/forgot-password", "/change-password", "/dashboard", "/confessions", "/team-chat", "/members", "/departments", "/activities", "/attendance", "/volunteer", "/schedule", "/checkin", "/history", "/emulation", "/achievements", "/games", "/quizzes", "/feed", "/polls", "/feedback", "/approvals", "/reports", "/chapter-reports", "/cms", "/profile", "/settings", "/audit"],
    }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
