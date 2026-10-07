import type { Bom } from "../bom/bom";
import { profileLabel } from "../bom/bom";

const ROLE_RU: Record<string, string> = {
  stud: "Стойка",
  track: "Обвязка",
  jamb: "Стойка проёма",
  sill: "Подоконный ригель",
  cripple: "Короткая стойка",
  post: "Стойка навеса",
  beam: "Балка",
  nogging: "Ригель",
  brace: "Связь",
  "top-chord": "Верхний пояс",
  "bottom-chord": "Нижний пояс",
  "truss-web": "Решётка фермы",
  purlin: "Прогон",
  lintel: "Перемычка",
  batten: "Обрешётка",
};

export const roleLabel = (role: string) => ROLE_RU[role] ?? role;

const esc = (v: string | number) => {
  const s = typeof v === "number" ? String(Math.round(v * 100) / 100).replace(".", ",") : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const table = (rows: (string | number)[][]) => "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n") + "\r\n";

/** Specification for the estimate / purchasing (opens in Excel: UTF-8 BOM, «;») */
export function bomCsv(bom: Bom): string {
  const rows: (string | number)[][] = [["Раздел", "Позиция", "Кол-во", "Ед.", "Погонаж, м", "Масса, кг"]];
  for (const p of bom.profiles) rows.push(["Профиль", p.designation, p.pieces, "шт", p.metres, p.massKg]);
  for (const a of bom.assemblies) rows.push(["Сборка", `${a.mark} — ${a.name}`, a.qty, "шт", "", a.massKg * a.qty]);
  rows.push(["Итого", "Сталь нетто", "", "кг", bom.totals.metres, bom.totals.massKg]);
  rows.push(["Итого", "Сталь с отходом", "", "кг", "", bom.totals.massWithScrapKg]);
  rows.push(["Крепёж", "Саморезы / заклёпки (по парам димплов)", bom.totals.fasteners, "шт", "", ""]);
  rows.push(["Крепёж", "Анкеры / болты", bom.totals.bolts, "шт", "", ""]);
  return table(rows);
}

/**
 * Cut list in a machine-NEUTRAL layout. It is not the roll-former's input
 * format (the line's file format is unknown) — it is the source a converter to
 * that format will read, and a check sheet for the operator.
 */
export function cutListCsv(bom: Bom): string {
  const rows: (string | number)[][] = [["Марка детали", "Сборка", "Элемент", "Профиль", "Длина, мм", "Кол-во", "Операции (тип@позиция/смещение или +длина, мм)"]];
  for (const c of bom.cutList) rows.push([c.pieceMark, c.assemblyMark, roleLabel(c.role), profileLabel(c.profileId), c.length, c.qty, c.operations]);
  return table(rows);
}
