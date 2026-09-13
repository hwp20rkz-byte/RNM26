import { applyParkingFloorAndReserve } from "./engine";
import type {
  AgendaItem,
  BuildingProfile,
  GeneralMeeting,
  OwnershipUnit,
  UnitType,
} from "./types";

// ---------------------------------------------------------------------------
// Кворум и голосование считаются от ПЛОЩАДИ помещений реестра, а не от
// количества собственников — так задаёт голос Закон РК «О жилищных
// отношениях» для кондоминиума. Общий знаменатель — сумма площадей ВСЕХ
// юнитов реестра (квартиры + нежилые + кладовые + машиноместа), т.к. все они
// являются самостоятельными объектами права со своей долей в общем имуществе.
//
// Порог принятия решения по конкретному вопросу повестки (простое
// большинство >50% vs квалифицированное ≥2/3) зависит от категории вопроса
// и это должен определить председатель/собрание — инструмент считает оба
// знаменателя (от присутствующих и от общего числа голосов) явно, ничего не
// решая за пользователя.
// ---------------------------------------------------------------------------

export interface QuorumResult {
  totalUnits: number;
  totalArea: number;
  presentUnits: number;
  presentArea: number;
  quorumPercent: number;
  /** Кворум состоялся — площадь присутствующих строго больше половины общей площади */
  quorumMet: boolean;
}

export function computeQuorum(units: OwnershipUnit[], meeting: GeneralMeeting): QuorumResult {
  const totalArea = units.reduce((sum, u) => sum + u.area, 0);
  const presentIds = new Set(meeting.participants.filter((p) => p.present).map((p) => p.unitId));
  const presentUnits = units.filter((u) => presentIds.has(u.id));
  const presentArea = presentUnits.reduce((sum, u) => sum + u.area, 0);

  return {
    totalUnits: units.length,
    totalArea: round2(totalArea),
    presentUnits: presentUnits.length,
    presentArea: round2(presentArea),
    quorumPercent: totalArea > 0 ? round2((presentArea / totalArea) * 100) : 0,
    quorumMet: presentArea > totalArea / 2 && totalArea > 0,
  };
}

export interface AgendaItemResult {
  agendaItemId: string;
  forArea: number;
  againstArea: number;
  abstainArea: number;
  /** Присутствует, но голос по этому вопросу не зафиксирован */
  notVotedArea: number;
  totalArea: number;
  presentArea: number;
  forPercentOfPresent: number;
  forPercentOfTotal: number;
  /** Требуемая доля голосов «за» в % (50 или 66.67) — от площади присутствующих */
  thresholdPercent: number;
  passed: boolean;
}

export function computeAgendaItemResult(
  units: OwnershipUnit[],
  meeting: GeneralMeeting,
  agendaItem: AgendaItem,
): AgendaItemResult {
  const areaById = new Map(units.map((u) => [u.id, u.area]));
  const totalArea = units.reduce((sum, u) => sum + u.area, 0);
  const presentIds = new Set(meeting.participants.filter((p) => p.present).map((p) => p.unitId));
  const presentArea = [...presentIds].reduce((sum, id) => sum + (areaById.get(id) ?? 0), 0);

  let forArea = 0;
  let againstArea = 0;
  let abstainArea = 0;
  for (const v of meeting.votes) {
    if (v.agendaItemId !== agendaItem.id) continue;
    if (!presentIds.has(v.unitId)) continue; // голос считается только для зарегистрированного участника
    const area = areaById.get(v.unitId) ?? 0;
    if (v.choice === "for") forArea += area;
    else if (v.choice === "against") againstArea += area;
    else abstainArea += area;
  }
  const notVotedArea = Math.max(0, presentArea - forArea - againstArea - abstainArea);

  const passed =
    agendaItem.majorityRule === "qualified"
      ? forArea >= (presentArea * 2) / 3 && presentArea > 0
      : forArea > presentArea / 2 && presentArea > 0;

  return {
    agendaItemId: agendaItem.id,
    forArea: round2(forArea),
    againstArea: round2(againstArea),
    abstainArea: round2(abstainArea),
    notVotedArea: round2(notVotedArea),
    totalArea: round2(totalArea),
    presentArea: round2(presentArea),
    forPercentOfPresent: presentArea > 0 ? round2((forArea / presentArea) * 100) : 0,
    forPercentOfTotal: totalArea > 0 ? round2((forArea / totalArea) * 100) : 0,
    thresholdPercent: agendaItem.majorityRule === "qualified" ? round2((2 / 3) * 100) : 50,
    passed,
  };
}

// ---------------------------------------------------------------------------
// Начисления по юнитам реестра — тариф В (₸/м²/мес.) × площадь юнита, с
// коэффициентом по типу помещения (решение собрания, из профиля объекта):
// свой коэффициент для нежилых, кладовых и машиномест — по образцу нежилых.
// Для машиномест дополнительно применяется пол (минимальная плата) и резерв
// на неплатежи (applyParkingFloorAndReserve, engine.ts) — по площади ЭТОГО
// конкретного юнита, а не средней площади места, как в быстром расчёте Шага 1.
// ---------------------------------------------------------------------------

export function computeUnitMonthlyAccrual(
  unit: OwnershipUnit,
  tariffPerSqm: number,
  building: Pick<
    BuildingProfile,
    | "commercialRateCoefficient"
    | "storageRateCoefficient"
    | "parkingRateCoefficient"
    | "parkingFlatFeePerSpot"
    | "parkingNonPaymentRatePercent"
  >,
): number {
  if (unit.unitType === "parking") {
    const areaBased = round2(tariffPerSqm * building.parkingRateCoefficient * unit.area);
    return applyParkingFloorAndReserve(areaBased, building);
  }
  const coefficient =
    unit.unitType === "commercial"
      ? building.commercialRateCoefficient
      : unit.unitType === "storage"
        ? building.storageRateCoefficient
        : 1;
  return round2(tariffPerSqm * coefficient * unit.area);
}

export interface RegistryTotals {
  totalUnits: number;
  totalArea: number;
  byType: Record<UnitType, { count: number; area: number }>;
}

export function computeRegistryTotals(units: OwnershipUnit[]): RegistryTotals {
  const byType: Record<UnitType, { count: number; area: number }> = {
    apartment: { count: 0, area: 0 },
    commercial: { count: 0, area: 0 },
    storage: { count: 0, area: 0 },
    parking: { count: 0, area: 0 },
  };
  for (const u of units) {
    byType[u.unitType].count += 1;
    byType[u.unitType].area += u.area;
  }
  for (const key of Object.keys(byType) as UnitType[]) {
    byType[key].area = round2(byType[key].area);
  }
  return {
    totalUnits: units.length,
    totalArea: round2(units.reduce((sum, u) => sum + u.area, 0)),
    byType,
  };
}

// ---------------------------------------------------------------------------
// Задолженность из импортированной ведомости ЕРЦ (см. parseErcStatement.ts).
// «Месяцы задолженности» — оценка, не факт: исходная сальдовая ведомость —
// снимок ОДНОГО расчётного периода (начальное+начисление+платёж за месяц),
// без помесячной истории. Формула closingBalance / accrual(этот период)
// предполагает, что тариф и объём начисления были стабильны в предыдущие
// месяцы — верно для ТО лифтов (фиксированная ставка на помещение) и почти
// всегда верно для эксплуатационных расходов (тариф×площадь, площадь не
// меняется), но при изменении тарифа задним числом даёт приближение, а не
// точный факт. Точный расчёт требует помесячных ведомостей за весь период.
// ---------------------------------------------------------------------------

const DEBT_EPSILON = 0.5;

export function computeDebtMonths(closingBalanceKzt: number, monthlyChargeKzt: number): number {
  if (closingBalanceKzt <= DEBT_EPSILON || monthlyChargeKzt <= 0) return 0;
  return round1(closingBalanceKzt / monthlyChargeKzt);
}

export interface UnitDebtStatus {
  /** Долг к взысканию (только положительные составляющие) — то, что показываем как «задолженность», ₸ */
  totalDebtKzt: number;
  /** Сырая сумма конечных сальдо — может быть отрицательной (переплата/аванс), ₸ */
  totalBalanceKzt: number;
  elevatorDebtKzt: number;
  operationalDebtKzt: number;
  elevatorDebtMonths: number;
  operationalDebtMonths: number;
  isDebtor: boolean;
}

export function computeUnitDebtStatus(unit: OwnershipUnit): UnitDebtStatus {
  const elevatorDebtKzt = unit.debtElevatorKzt ?? 0;
  const operationalDebtKzt = unit.debtOperationalKzt ?? 0;
  const totalBalanceKzt = round2(elevatorDebtKzt + operationalDebtKzt);
  return {
    totalDebtKzt: round2(Math.max(0, elevatorDebtKzt) + Math.max(0, operationalDebtKzt)),
    totalBalanceKzt,
    elevatorDebtKzt,
    operationalDebtKzt,
    elevatorDebtMonths: computeDebtMonths(elevatorDebtKzt, unit.monthlyChargeElevatorKzt ?? 0),
    operationalDebtMonths: computeDebtMonths(operationalDebtKzt, unit.monthlyChargeOperationalKzt ?? 0),
    isDebtor: totalBalanceKzt > DEBT_EPSILON,
  };
}

export interface RegistryDebtSummary {
  unitsWithDebtData: number;
  debtorCount: number;
  totalDebtKzt: number;
  elevatorDebtKzt: number;
  operationalDebtKzt: number;
  /** Средние месяцы долга — только среди должников по конкретной услуге, не по всем юнитам */
  averageDebtMonthsElevator: number;
  averageDebtMonthsOperational: number;
  topDebtors: { unit: OwnershipUnit; status: UnitDebtStatus }[];
  debtPeriod?: string;
}

export function computeRegistryDebtSummary(units: OwnershipUnit[], topN = 10): RegistryDebtSummary {
  const withDebtData = units.filter((u) => u.debtImportedAt);
  const statuses = withDebtData.map((unit) => ({ unit, status: computeUnitDebtStatus(unit) }));
  const debtors = statuses.filter((s) => s.status.isDebtor);

  const elevatorDebtors = debtors.filter((s) => s.status.elevatorDebtMonths > 0);
  const operationalDebtors = debtors.filter((s) => s.status.operationalDebtMonths > 0);
  const avg = (list: typeof debtors, pick: (s: UnitDebtStatus) => number) =>
    list.length > 0 ? round1(list.reduce((sum, s) => sum + pick(s.status), 0) / list.length) : 0;

  const topDebtors = [...debtors].sort((a, b) => b.status.totalDebtKzt - a.status.totalDebtKzt).slice(0, topN);

  const debtPeriod = withDebtData
    .map((u) => u.debtPeriod)
    .filter((p): p is string => !!p)
    .sort()
    .at(-1);

  return {
    unitsWithDebtData: withDebtData.length,
    debtorCount: debtors.length,
    totalDebtKzt: round2(debtors.reduce((sum, s) => sum + s.status.totalDebtKzt, 0)),
    elevatorDebtKzt: round2(debtors.reduce((sum, s) => sum + Math.max(0, s.status.elevatorDebtKzt), 0)),
    operationalDebtKzt: round2(debtors.reduce((sum, s) => sum + Math.max(0, s.status.operationalDebtKzt), 0)),
    averageDebtMonthsElevator: avg(elevatorDebtors, (s) => s.elevatorDebtMonths),
    averageDebtMonthsOperational: avg(operationalDebtors, (s) => s.operationalDebtMonths),
    topDebtors,
    debtPeriod,
  };
}

// ---------------------------------------------------------------------------
// WhatsApp-уведомление конкретному должнику — в отличие от buildWaLink в
// workOrderEngine.ts (общая ссылка без номера, для рассылки по мессенджеру
// вручную), здесь ссылка ведёт на конкретный номер телефона должника из
// реестра (wa.me/<номер>), т.к. у нас есть OwnershipUnit.ownerPhone.
// ---------------------------------------------------------------------------

/** Приводит телефон к цифрам международного формата для wa.me (KZ: 8xxx -> 7xxx, 10 цифр без кода -> +7). */
export function normalizePhoneForWa(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10) digits = "7" + digits;
  return digits;
}

export function buildWaLinkToPhone(phone: string, text: string): string {
  return `https://wa.me/${normalizePhoneForWa(phone)}?text=${encodeURIComponent(text)}`;
}

function formatKztPlain(v: number): string {
  return `${Math.round(v).toLocaleString("ru-RU")} ₸`;
}

export function buildDebtNoticeMessage(unit: OwnershipUnit, status: UnitDebtStatus, buildingName: string): string {
  const lines = [
    `*Уведомление о задолженности*`,
    `Объект: ${buildingName}`,
    `Квартира №${unit.number}${unit.ownerName ? `, ${unit.ownerName}` : ""}`,
    "",
  ];
  if (status.operationalDebtKzt > DEBT_EPSILON) {
    lines.push(`Эксплуатационные расходы: ${formatKztPlain(status.operationalDebtKzt)} (≈${status.operationalDebtMonths} мес.)`);
  }
  if (status.elevatorDebtKzt > DEBT_EPSILON) {
    lines.push(`ТО лифтов: ${formatKztPlain(status.elevatorDebtKzt)} (≈${status.elevatorDebtMonths} мес.)`);
  }
  lines.push("", `Итого к оплате: ${formatKztPlain(status.totalDebtKzt)}`);
  if (unit.debtPeriod) lines.push(`Период ведомости: ${unit.debtPeriod}`);
  lines.push("", "Просьба погасить задолженность. По вопросам обращайтесь в правление.");
  return lines.join("\n");
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
