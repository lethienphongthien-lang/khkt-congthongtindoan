"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { makeT, type TFn } from "./translate";

const Ctx = createContext<{ locale: Locale; t: TFn }>({ locale: "vi", t: makeT("vi") });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx).t;
export const useLocale = () => useContext(Ctx).locale;
