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
// ---------------------------------------------------------------------------

export function computeUnitMonthlyAccrual(
  unit: OwnershipUnit,
  tariffPerSqm: number,
  rateCoefficients: Pick<
    BuildingProfile,
    "commercialRateCoefficient" | "storageRateCoefficient" | "parkingRateCoefficient"
  >,
): number {
  const coefficient =
    unit.unitType === "commercial"
      ? rateCoefficients.commercialRateCoefficient
      : unit.unitType === "storage"
        ? rateCoefficients.storageRateCoefficient
        : unit.unitType === "parking"
          ? rateCoefficients.parkingRateCoefficient
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

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
