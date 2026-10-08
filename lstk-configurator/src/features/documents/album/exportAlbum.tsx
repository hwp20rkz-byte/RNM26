"use client";

import { renderToStaticMarkup } from "react-dom/server";
import type { Analysis } from "@/domain/planner/analyze";
import { Album } from "./Album";
import type { SheetMeta } from "./sheet";

/**
 * The album as one self-contained HTML document: every sheet an A3 landscape
 * page. Print it (Save as PDF) or open it in a browser; SVG keeps the lines
 * vector-sharp at any zoom.
 */
export function albumHtml(a: Analysis, meta: SheetMeta, d: (k: string) => string, lang: string): string {
  const body = renderToStaticMarkup(<Album a={a} meta={meta} d={d} />);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${meta.code}</title>
<style>
:root{--ink:0 0% 10%;--accent:24 88% 42%}
@page{size:420mm 297mm;margin:0}
html,body{margin:0;padding:0;background:#888}
.album-sheet{width:420mm;height:297mm;margin:0 auto 8mm;background:#fff;page-break-after:always;break-after:page;overflow:hidden}
.album-sheet svg{display:block}
@media print{html,body{background:#fff}.album-sheet{margin:0}}
</style></head><body>${body}</body></html>`;
}
