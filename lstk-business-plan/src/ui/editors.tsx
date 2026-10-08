import type { Dispatch, SetStateAction } from "react";
import { houseEconomics } from "../model/calc";
import type { CapexItem, CostItem, FinanceSettings, FrameSettings, HouseType, OpexItem, PaymentTerms, PlanInputs, SalesPlan } from "../model/types";
import { money, moneyShort, num } from "../format";
import { newId } from "../storage";
import { Coins, HouseLine, ListPlus, Plus, Trash, Wrench } from "@phosphor-icons/react";
import { EmptyState, IconButton, NumberField, Section, Segmented, SelectField, TextField } from "./fields";

type SetInputs = Dispatch<SetStateAction<PlanInputs>>;
interface EditorProps {
  inputs: PlanInputs;
  set: SetInputs;
}

function patchItem<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function HousesEditor({ inputs, set }: EditorProps) {
  const update = (id: string, patch: Partial<HouseType>) => set((p) => ({ ...p, houses: patchItem(p.houses, id, patch) }));
  const shareSum = sum(inputs.houses.map((h) => h.sharePct));
  return (
    <Section title="Типы домов" summary={`${inputs.houses.length} шт.`} defaultOpen>
      <p className="note">Что продаёте: площадь, цена за м², срок стройки и доля в продажах.</p>
      {inputs.houses.length === 0 && (
        <EmptyState icon={<HouseLine size={28} />} title="Типов домов пока нет" text="Без них план продаж пуст. Добавьте хотя бы один тип: площадь, цену за м² и срок стройки." />
      )}
      {inputs.houses.map((h) => (
        <div className="card-row" key={h.id}>
          <div className="card-row__head">
            <TextField label="Название" value={h.name} onChange={(name) => update(h.id, { name })} compact />
            <IconButton
              label={`Удалить «${h.name}»`}
              onClick={() =>
                set((p) => ({
                  ...p,
                  houses: p.houses.filter((x) => x.id !== h.id),
                  costItems: p.costItems.map((c) => ({ ...c, appliesTo: c.appliesTo.filter((a) => a !== h.id) }))
                }))
              }
            >
              <Trash size={18} />
            </IconButton>
          </div>
          <div className="grid-fields">
            <NumberField label="Площадь" unit="м²" value={h.area} min={0} onChange={(area) => update(h.id, { area })} />
            <NumberField label="Цена за м²" unit="₸" value={h.pricePerM2} min={0} onChange={(pricePerM2) => update(h.id, { pricePerM2 })} />
            <NumberField label="Срок стройки" unit="мес." value={h.durationMonths} min={1} max={24} onChange={(durationMonths) => update(h.id, { durationMonths })} />
            <NumberField label="Доля продаж" unit="%" value={h.sharePct} min={0} max={100} onChange={(sharePct) => update(h.id, { sharePct })} />
          </div>
          <p className="field__hint">Цена дома: {money(h.area * h.pricePerM2)}</p>
        </div>
      ))}
      {shareSum !== 100 && inputs.houses.length > 0 && (
        <p className="note note--warn">Сумма долей {num(shareSum)}%. Доли будут пересчитаны пропорционально до 100%.</p>
      )}
      <button
        type="button"
        className="btn btn--ghost btn--add"
        onClick={() =>
          set((p) => {
            const id = newId();
            return {
              ...p,
              houses: [...p.houses, { id, name: "Новый тип", area: 100, pricePerM2: 200_000, durationMonths: 3, sharePct: 10 }],
              // новый тип получает все базовые статьи, которые применяются ко всем существующим
              costItems: p.costItems.map((c) => (p.houses.length > 0 && p.houses.every((x) => c.appliesTo.includes(x.id)) ? { ...c, appliesTo: [...c.appliesTo, id] } : c))
            };
          })
        }
      >
        <Plus size={18} aria-hidden="true" />
        Добавить тип дома
      </button>
    </Section>
  );
}

export function FrameEditor({ inputs, set }: EditorProps) {
  const f = inputs.frame;
  const update = (patch: Partial<FrameSettings>) => set((p) => ({ ...p, frame: { ...p.frame, ...patch } }));
  return (
    <Section title="Каркас ЛСТК" summary={f.source === "own" ? "своя линия" : "покупной"} defaultOpen>
      <Segmented
        legend="Откуда каркас"
        value={f.source}
        options={[
          { value: "own", label: "Своя линия" },
          { value: "buy", label: "Покупаем у завода" }
        ]}
        onChange={(source) => update({ source })}
      />
      <div className="grid-fields">
        <NumberField label="Металлоёмкость" unit="кг/м²" value={f.kgPerM2} min={0} hint="Ориентир 25-35 кг на м² дома, точнее по проекту" onChange={(kgPerM2) => update({ kgPerM2 })} />
        <NumberField label="Отходы" unit="%" value={f.wastePct} min={0} max={50} onChange={(wastePct) => update({ wastePct })} />
        {f.source === "own" ? (
          <>
            <NumberField label="Цена рулона" unit="₸/кг" value={f.coilPricePerKg} min={0} onChange={(coilPricePerKg) => update({ coilPricePerKg })} />
            <NumberField label="Мощность линии" unit="кг/мес." value={f.lineCapacityKgPerMonth} min={0} onChange={(lineCapacityKgPerMonth) => update({ lineCapacityKgPerMonth })} />
          </>
        ) : (
          <NumberField label="Цена каркаса" unit="₸/кг" value={f.boughtPricePerKg} min={0} onChange={(boughtPricePerKg) => update({ boughtPricePerKg })} />
        )}
      </div>
      <p className="note">
        Сравните режимы переключателем: своя линия дешевле по металлу, но добавляет оборудование в капзатраты (позиции «только своя линия»).
      </p>
    </Section>
  );
}

export function CostItemsEditor({ inputs, set }: EditorProps) {
  const update = (id: string, patch: Partial<CostItem>) => set((p) => ({ ...p, costItems: patchItem(p.costItems, id, patch) }));
  const toggle = (item: CostItem, houseId: string) =>
    update(item.id, {
      appliesTo: item.appliesTo.includes(houseId) ? item.appliesTo.filter((x) => x !== houseId) : [...item.appliesTo, houseId]
    });
  return (
    <Section title="Себестоимость" summary={`${inputs.costItems.length} статей`}>
      <p className="note">Материалы и работы на м² или на дом. Отметьте, к каким типам домов относится статья.</p>
      {inputs.costItems.length === 0 && (
        <EmptyState icon={<ListPlus size={28} />} title="Статей себестоимости нет" text="Сейчас в доме учитывается только каркас. Добавьте фундамент, утеплитель, кровлю и работы." />
      )}
      {inputs.costItems.map((c) => (
        <div className="card-row" key={c.id}>
          <div className="card-row__head">
            <TextField label="Статья" value={c.name} onChange={(name) => update(c.id, { name })} compact />
            <IconButton label={`Удалить «${c.name}»`} onClick={() => set((p) => ({ ...p, costItems: p.costItems.filter((x) => x.id !== c.id) }))}>
              <Trash size={18} />
            </IconButton>
          </div>
          <div className="grid-fields">
            <NumberField label="Сумма" unit={c.basis === "perM2" ? "₸/м²" : "₸/дом"} value={c.amount} min={0} onChange={(amount) => update(c.id, { amount })} />
            <SelectField
              label="База"
              value={c.basis}
              options={[
                { value: "perM2", label: "за м²" },
                { value: "perHouse", label: "за дом" }
              ]}
              onChange={(basis) => update(c.id, { basis })}
            />
            <SelectField
              label="Вид"
              value={c.kind}
              options={[
                { value: "material", label: "Материалы" },
                { value: "labor", label: "Работы" }
              ]}
              onChange={(kind) => update(c.id, { kind })}
            />
          </div>
          <div className="chips" role="group" aria-label={`Типы домов для «${c.name}»`}>
            {inputs.houses.map((h) => (
              <label key={h.id} className={c.appliesTo.includes(h.id) ? "chip is-on" : "chip"}>
                <input type="checkbox" checked={c.appliesTo.includes(h.id)} onChange={() => toggle(c, h.id)} />
                {h.name}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--ghost btn--add"
        onClick={() =>
          set((p) => ({
            ...p,
            costItems: [...p.costItems, { id: newId(), name: "Новая статья", kind: "material", basis: "perM2", amount: 0, appliesTo: p.houses.map((h) => h.id) }]
          }))
        }
      >
        <Plus size={18} aria-hidden="true" />
        Добавить статью
      </button>
      <CostSummary inputs={inputs} />
    </Section>
  );
}

function CostSummary({ inputs }: { inputs: PlanInputs }) {
  return (
    <div className="mini-summary">
      <p className="mini-summary__title">Себестоимость за м² с резервом</p>
      <ul>
      {inputs.houses.map((h) => {
        const e = houseEconomics(inputs, h);
        return (
          <li key={h.id}>
            <span>{h.name}</span>
            <span className="tabular">{h.area > 0 ? `${num(e.directCost / h.area)} ₸/м²` : "нет площади"}</span>
          </li>
        );
      })}
      </ul>
    </div>
  );
}

export function SalesEditor({ inputs, set }: EditorProps) {
  const s = inputs.sales;
  const update = (patch: Partial<SalesPlan>) => set((p) => ({ ...p, sales: { ...p.sales, ...patch } }));
  const monthsRu = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
  return (
    <Section title="План продаж" summary={`до ${num(s.targetPerMonth)} дог./мес.`} defaultOpen>
      <div className="grid-fields">
        <SelectField
          label="Месяц старта проекта"
          value={String(s.startCalendarMonth)}
          options={monthsRu.map((m, i) => ({ value: String(i + 1), label: m }))}
          onChange={(v) => update({ startCalendarMonth: Number(v) })}
        />
        <NumberField label="Год старта" value={s.startYear} min={2000} max={2100} onChange={(startYear) => update({ startYear: Math.round(startYear) })} />
        <NumberField label="Первый договор через" unit="мес." value={s.firstSaleMonth} min={0} onChange={(firstSaleMonth) => update({ firstSaleMonth: Math.round(firstSaleMonth) })} />
        <NumberField label="Договоров в месяц на старте" value={s.startPerMonth} min={0} onChange={(startPerMonth) => update({ startPerMonth })} />
        <NumberField label="Договоров в месяц по плану" value={s.targetPerMonth} min={0} onChange={(targetPerMonth) => update({ targetPerMonth })} />
        <NumberField label="Выход на план за" unit="мес." value={s.rampMonths} min={0} onChange={(rampMonths) => update({ rampMonths: Math.round(rampMonths) })} />
      </div>
      <fieldset className="season">
        <legend className="field__label">Сезонность договоров (1 = обычный месяц)</legend>
        <div className="season__grid">
          {s.seasonality.map((v, i) => (
            <NumberField
              key={i}
              label={monthsRu[i]}
              value={v}
              min={0}
              max={5}
              onChange={(nv) => update({ seasonality: s.seasonality.map((x, j) => (j === i ? nv : x)) })}
            />
          ))}
        </div>
      </fieldset>
    </Section>
  );
}

export function PaymentsEditor({ inputs, set }: EditorProps) {
  const p = inputs.payments;
  const update = (patch: Partial<PaymentTerms>) => set((x) => ({ ...x, payments: { ...x.payments, ...patch } }));
  const final = Math.max(0, 100 - p.advancePct - p.midPct);
  return (
    <Section title="Оплата и закупки" summary={`${num(p.advancePct)}/${num(p.midPct)}/${num(final)}`}>
      <div className="grid-fields">
        <NumberField label="Аванс при договоре" unit="%" value={p.advancePct} min={0} max={100} onChange={(advancePct) => update({ advancePct })} />
        <NumberField label="Платёж в середине стройки" unit="%" value={p.midPct} min={0} max={100} onChange={(midPct) => update({ midPct })} />
        <NumberField
          label="Материалы закупаем сразу"
          unit="%"
          value={p.materialsUpfrontPct}
          min={0}
          max={100}
          hint="Остальное равномерно по ходу стройки"
          onChange={(materialsUpfrontPct) => update({ materialsUpfrontPct })}
        />
      </div>
      <p className="note">При сдаче дома клиент платит остаток: {num(final)}%.</p>
    </Section>
  );
}

function ListTotal({ label, value }: { label: string; value: number }) {
  return (
    <p className="list-total">
      <span>{label}</span>
      <strong className="tabular">{money(value)}</strong>
    </p>
  );
}

export function CapexEditor({ inputs, set }: EditorProps) {
  const update = (id: string, patch: Partial<CapexItem>) => set((p) => ({ ...p, capex: patchItem(p.capex, id, patch) }));
  const active = inputs.capex.filter((c) => !(c.ownLineOnly && inputs.frame.source === "buy"));
  return (
    <Section title="Капитальные затраты" summary={moneyShort(sum(active.map((c) => c.amount)))}>
      {inputs.capex.length === 0 && <EmptyState icon={<Wrench size={28} />} title="Капзатрат нет" text="Добавьте оборудование, цех, технику: они попадут в денежный поток и амортизацию." />}
      {inputs.capex.map((c) => {
        const off = c.ownLineOnly && inputs.frame.source === "buy";
        return (
          <div className={off ? "card-row is-off" : "card-row"} key={c.id}>
            <div className="card-row__head">
              <TextField label="Позиция" value={c.name} onChange={(name) => update(c.id, { name })} compact />
              <IconButton label={`Удалить «${c.name}»`} onClick={() => set((p) => ({ ...p, capex: p.capex.filter((x) => x.id !== c.id) }))}>
                <Trash size={18} />
              </IconButton>
            </div>
            <div className="grid-fields">
              <NumberField label="Сумма" unit="₸" value={c.amount} min={0} onChange={(amount) => update(c.id, { amount })} />
              <NumberField label="Месяц покупки" value={c.month} min={0} onChange={(month) => update(c.id, { month: Math.round(month) })} />
              <NumberField label="Амортизация" unit="мес." value={c.lifeMonths} min={1} onChange={(lifeMonths) => update(c.id, { lifeMonths: Math.round(lifeMonths) })} />
            </div>
            <label className="check">
              <input type="checkbox" checked={c.ownLineOnly} onChange={(e) => update(c.id, { ownLineOnly: e.target.checked })} />
              Только при своей линии{off ? " (сейчас не учитывается)" : ""}
            </label>
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn--ghost btn--add"
        onClick={() => set((p) => ({ ...p, capex: [...p.capex, { id: newId(), name: "Новая позиция", amount: 0, month: 0, lifeMonths: 60, ownLineOnly: false }] }))}
      >
        <Plus size={18} aria-hidden="true" />
        Добавить позицию
      </button>
      <ListTotal label="Учитывается в расчёте" value={sum(active.map((c) => c.amount))} />
    </Section>
  );
}

export function OpexEditor({ inputs, set }: EditorProps) {
  const update = (id: string, patch: Partial<OpexItem>) => set((p) => ({ ...p, opex: patchItem(p.opex, id, patch) }));
  return (
    <Section title="Постоянные расходы" summary={`${moneyShort(sum(inputs.opex.map((o) => o.amount)))}/мес.`}>
      {inputs.opex.length === 0 && <EmptyState icon={<Coins size={28} />} title="Постоянных расходов нет" text="Аренда, зарплата офиса, реклама: всё, что платится каждый месяц независимо от продаж." />}
      {inputs.opex.map((o) => (
        <div className="line-row" key={o.id}>
          <TextField label="Статья" value={o.name} onChange={(name) => update(o.id, { name })} compact />
          <NumberField label={`Сумма в месяц: ${o.name}`} unit="₸" value={o.amount} min={0} onChange={(amount) => update(o.id, { amount })} compact />
          <IconButton label={`Удалить «${o.name}»`} onClick={() => set((p) => ({ ...p, opex: p.opex.filter((x) => x.id !== o.id) }))}>
            <Trash size={18} />
          </IconButton>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--add" onClick={() => set((p) => ({ ...p, opex: [...p.opex, { id: newId(), name: "Новая статья", amount: 0 }] }))}>
        <Plus size={18} aria-hidden="true" />
        Добавить статью
      </button>
      <ListTotal label="Итого в месяц" value={sum(inputs.opex.map((o) => o.amount))} />
    </Section>
  );
}

export function FinanceEditor({ inputs, set }: EditorProps) {
  const f = inputs.finance;
  const update = (patch: Partial<FinanceSettings>) => set((p) => ({ ...p, finance: { ...p.finance, ...patch } }));
  return (
    <Section title="Финансирование и налоги" summary={moneyShort(f.equity + f.loanAmount)}>
      <h3 className="subhead">Деньги на старте</h3>
      <div className="grid-fields">
        <NumberField label="Собственный капитал" unit="₸" value={f.equity} min={0} onChange={(equity) => update({ equity })} />
        <NumberField label="Кредит" unit="₸" value={f.loanAmount} min={0} onChange={(loanAmount) => update({ loanAmount })} />
        <NumberField label="Ставка кредита" unit="% год." value={f.loanRatePct} min={0} max={100} onChange={(loanRatePct) => update({ loanRatePct })} />
        <NumberField label="Срок кредита" unit="мес." value={f.loanTermMonths} min={1} onChange={(loanTermMonths) => update({ loanTermMonths: Math.round(loanTermMonths) })} />
        <NumberField label="Льготный период" unit="мес." value={f.loanGraceMonths} min={0} hint="Только проценты, без тела" onChange={(loanGraceMonths) => update({ loanGraceMonths: Math.round(loanGraceMonths) })} />
      </div>
      <h3 className="subhead">Налоги и прочее</h3>
      <Segmented
        legend="Налоговый режим"
        value={f.taxRegime}
        options={[
          { value: "simplified", label: "Упрощённая декларация" },
          { value: "general", label: "Общий режим (КПН)" }
        ]}
        onChange={(taxRegime) => update({ taxRegime })}
      />
      <div className="grid-fields">
        {f.taxRegime === "simplified" ? (
          <NumberField label="Ставка от дохода" unit="%" value={f.simplifiedRatePct} min={0} max={100} hint="Проверьте ставку и лимит дохода для вашего региона" onChange={(simplifiedRatePct) => update({ simplifiedRatePct })} />
        ) : (
          <NumberField label="КПН от прибыли" unit="%" value={f.citRatePct} min={0} max={100} onChange={(citRatePct) => update({ citRatePct })} />
        )}
        <NumberField label="Комиссия продаж" unit="%" value={f.salesCommissionPct} min={0} max={100} onChange={(salesCommissionPct) => update({ salesCommissionPct })} />
        <NumberField label="Непредвиденные" unit="%" value={f.contingencyPct} min={0} max={100} hint="Резерв к прямой себестоимости" onChange={(contingencyPct) => update({ contingencyPct })} />
      </div>
      <h3 className="subhead">Горизонт и оценка</h3>
      <div className="grid-fields">
        <NumberField label="Горизонт плана" unit="мес." value={f.horizonMonths} min={6} max={120} onChange={(horizonMonths) => update({ horizonMonths: Math.round(horizonMonths) })} />
        <NumberField label="Ставка дисконтирования" unit="% год." value={f.discountRatePct} min={0} max={100} hint="Доходность, которую вы требуете от вложений" onChange={(discountRatePct) => update({ discountRatePct })} />
      </div>
    </Section>
  );
}
