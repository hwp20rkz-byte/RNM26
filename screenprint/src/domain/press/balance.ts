import { ANCHOR_BEHIND, HEAD_REAR, pressLayout } from "./geometry";
import type { BalanceGeometry } from "./springs";
import type { PressConfig } from "./types";

/**
 * Геометрия уравновешивания, вытекающая из размеров головки (geometry.ts):
 * крюки пружин — рым-винты в задней кромке языка на высоте оси (рычаг 75 мм
 * назад, подъём 0), анкер — рым-болт на блоке на плите основания на 140 мм
 * позади оси и на (pivot.z − 28) мм ниже её. При опущенной раме пружина
 * длиной 109 мм, при поднятой на 70° — 116 мм: складская пружина 100 мм
 * растягивается на 34–41 мм, то есть в пределах ресурса, и момент пружин
 * наверху растёт, так что рама держится без рук.
 * Преднатяг талрепа по умолчанию 25 мм из диапазона 0–40.
 */
export function balanceGeometry(cfg: PressConfig, preload = 25): BalanceGeometry {
  const L = pressLayout(cfg);
  return {
    armLength: HEAD_REAR,
    armRise: 0,
    anchor: { y: -ANCHOR_BEHIND, z: -(L.pivot.z - 28) },
    preload,
    springs: 2,
  };
}
