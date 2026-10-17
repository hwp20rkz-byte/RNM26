// Цехи распила Астаны и их цены на работы, ₸. Источник: список заказчика от 17.10.2026
// (см. docs/prices/astana-2026-10.md). Цены материалов (листов) здесь нет: их задаёт салон.

export interface Price {
  value: number; // ₸
  from: boolean; // в прайсе «от» — это нижняя граница, реальная цена может быть выше
}

export interface WorkshopPrices {
  id: string;
  name: string;
  address: string | null;
  contacts: string[];
  services: string[];
  cutting: {
    ownLdsp: Price | null; // ЛДСП куплен в этом же цехе, ₸ за лист
    ldsp: Price | null; // сторонний ЛДСП, ₸ за лист
    eggerLdsp: Price | null; // ЛДСП Egger, ₸ за лист
  };
  edgingPerM: Price | null; // кромка ПВХ, ₸ за погонный метр (толщина в прайсе не указана)
  filmFacadePerM2: Price | null; // фасады МДФ в плёнке, ₸ за м²
  countertop: Price | null; // столешницы; единица в прайсе не указана, в расчёт не идёт
  source: string;
}

const from = (value: number): Price => ({ value, from: true });
const exact = (value: number): Price => ({ value, from: false });

const SOURCE = 'Список заказчика от 17.10.2026';

export const WORKSHOPS: WorkshopPrices[] = [
  {
    id: 'damen',
    name: 'Damen Mebel',
    address: null,
    contacts: [],
    services: ['Распил ЛДСП с кромкой', 'Распил стороннего ЛДСП и Egger', 'Столешницы', 'Кромка ПВХ'],
    cutting: { ownLdsp: from(1500), ldsp: exact(2000), eggerLdsp: exact(2000) },
    edgingPerM: from(150),
    filmFacadePerM2: null,
    countertop: exact(1200),
    source: SOURCE,
  },
  {
    id: 'lemod',
    name: 'Raspil Lemod',
    address: 'ул. Шары Жиенкуловой',
    contacts: ['+7 777 225 4455', '+7 707 991 29 25', 'Instagram @raspil_lemod'],
    services: ['Распил ЛДСП', 'Распил ЛДСП Egger', 'Фасады МДФ в плёнке'],
    cutting: { ownLdsp: null, ldsp: from(2000), eggerLdsp: exact(2200) },
    edgingPerM: null,
    filmFacadePerM2: from(20000),
    countertop: null,
    source: SOURCE,
  },
  {
    id: 'roomset',
    name: 'RoomSet',
    address: null,
    contacts: ['roomset.kz'],
    services: ['Распил и раскрой на ЧПУ (нестинг-центр)'],
    cutting: { ownLdsp: null, ldsp: from(2000), eggerLdsp: from(2000) },
    edgingPerM: null,
    filmFacadePerM2: null,
    countertop: null,
    source: SOURCE,
  },
  {
    id: 'center',
    name: 'Центр распила и покраски',
    address: 'Байконыр район, ул. Шары Жиенкуловой, 5/9 и 8/3',
    contacts: ['2ГИС'],
    services: ['Распил', 'Закатка', 'Покраска МДФ', 'Присадка отверстий'],
    cutting: { ownLdsp: null, ldsp: null, eggerLdsp: null },
    edgingPerM: null,
    filmFacadePerM2: null,
    countertop: null,
    source: `${SOURCE}; цен в списке нет`,
  },
];

export const workshopById = (id: string) => WORKSHOPS.find((w) => w.id === id) ?? WORKSHOPS[0]!;
