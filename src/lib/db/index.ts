import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Giới hạn số kết nối mỗi instance. Mặc định Prisma mở (số CPU × 2 + 1) kết nối; trên serverless mỗi instance
 * một pool nên nhanh chóng vượt giới hạn của gói DB nhỏ ("too many connections").
 * Có thể đặt DB_CONNECTION_LIMIT; hoặc tự thêm connection_limit vào DATABASE_URL.
 */
function datasourceUrl() {
  // Ưu tiên chuỗi qua bộ gom kết nối (pooler) nếu có; DATABASE_URL vẫn là kết nối trực tiếp dùng cho tạo bảng/seed.
  const url = process.env.DATABASE_POOLED_URL || process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return url;
  const limit = process.env.DB_CONNECTION_LIMIT ?? "2";
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=${limit}&pool_timeout=20`;
}

const create = () =>
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    ...(process.env.PRISMA_LOG ? { log: [{ emit: "stdout", level: "query" }] } : {}),
  });

// Client cache trong dev bị giữ qua hot-reload; bỏ nếu nó được tạo trước khi `prisma generate` thêm model mới.
const cached = globalForPrisma.prisma && "post" in globalForPrisma.prisma ? globalForPrisma.prisma : undefined;

export const db = cached ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
