"use client";

import { useMemo, useState } from "react";
import { Camera, ClipboardList, Plus, Printer, ScanLine, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject } from "@/store/hooks";
import { computeMaterialsCost } from "@/lib/calculator/inventoryEngine";
import { useBarcodeScanner, useBarcodeScannerSupport } from "@/lib/inventory/useBarcodeScanner";
import { buildLabelSheetHtml, openLabelSheet } from "@/lib/inventory/qrLabels";
import { formatKzt } from "@/lib/utils";
import { MAINTENANCE_WORK_TYPE_LABELS, type MaintenanceWorkType, type MaterialUsage } from "@/lib/calculator/types";
import { genId } from "@/lib/id";
import { useT } from "@/lib/i18n/useT";

const WORK_TYPES = Object.keys(MAINTENANCE_WORK_TYPE_LABELS) as MaintenanceWorkType[];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MaintenanceLog() {
  const t = useT();
  const project = useActiveProject();
  const recordMaintenanceLog = useProjectsStore((s) => s.recordMaintenanceLog);
  const removeMaintenanceLog = useProjectsStore((s) => s.removeMaintenanceLog);
  const updateAsset = useProjectsStore((s) => s.updateAsset);

  const [date, setDate] = useState(todayIso());
  const [technicianName, setTechnicianName] = useState("");
  const [workType, setWorkType] = useState<MaintenanceWorkType>("routine");
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [laborHours, setLaborHours] = useState<number | "">("");
  const [pressureInBar, setPressureInBar] = useState<number | "">("");
  const [pressureOutBar, setPressureOutBar] = useState<number | "">("");
  const [tempSupplyC, setTempSupplyC] = useState<number | "">("");
  const [costItemId, setCostItemId] = useState("");
  const [materials, setMaterials] = useState<MaterialUsage[]>([]);
  const [materialToAdd, setMaterialToAdd] = useState(project.spareParts[0]?.id ?? "");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);

  const scannerSupported = useBarcodeScannerSupport();
  const { videoRef, start, stop, active, error } = useBarcodeScanner((value) => {
    const asset = project.assets.find((a) => a.qrCodeId === value);
    if (asset) {
      setAssetId(asset.id);
      setScanMessage(`${t("mlFoundAssetPrefix")} ${asset.name}`);
      setScannerOpen(false);
      return;
    }
    const part = project.spareParts.find((p) => p.qrCodeId === value);
    if (part) {
      setMaterials((m) => [...m, { sparePartId: part.id, quantity: 1, unitPrice: part.avgUnitPrice }]);
      setScanMessage(`${t("mlAddedStockItemPrefix")} ${part.name}`);
      setScannerOpen(false);
      return;
    }
    setScanMessage(`${t("mlCodeNotFoundPrefix")}${value}${t("mlCodeNotFoundSuffix")}`);
  });

  const maintenanceCategories = project.db.categories.filter((c) => c.group === "maintenance");
  const assetsWithoutQr = project.assets.filter((a) => !a.qrCodeId);

  const materialsCost = computeMaterialsCost(materials);

  const recentLogs = useMemo(
    () => [...project.maintenanceLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    [project.maintenanceLogs],
  );
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  const sparePartById = new Map(project.spareParts.map((p) => [p.id, p]));

  function addMaterial() {
    const part = project.spareParts.find((p) => p.id === materialToAdd);
    if (!part) return;
    setMaterials((m) => [...m, { sparePartId: part.id, quantity: 1, unitPrice: part.avgUnitPrice }]);
  }

  function submit() {
    if (!technicianName.trim() || !description.trim()) return;
    recordMaintenanceLog({
      date,
      technicianName: technicianName.trim(),
      workType,
      description: description.trim(),
      assetId: assetId || undefined,
      laborHours: laborHours === "" ? undefined : laborHours,
      pressureInBar: pressureInBar === "" ? undefined : pressureInBar,
      pressureOutBar: pressureOutBar === "" ? undefined : pressureOutBar,
      tempSupplyC: tempSupplyC === "" ? undefined : tempSupplyC,
      costItemId: costItemId || undefined,
      materialsUsed: materials,
    });
    setTechnicianName("");
    setDescription("");
    setLaborHours("");
    setPressureInBar("");
    setPressureOutBar("");
    setTempSupplyC("");
    setMaterials([]);
  }

  async function handlePrintAllLabels() {
    setPrintBusy(true);
    try {
      const targets = assetsWithoutQr.length > 0 ? assetsWithoutQr : project.assets;
      for (const a of targets) {
        if (!a.qrCodeId) updateAsset(a.id, { qrCodeId: genId("asset") });
      }
      const html = await buildLabelSheetHtml(
        targets.map((a) => ({
          title: a.name,
          qrValue: a.qrCodeId || a.id,
          subtitle: a.location || project.name,
          footer: a.serialNumber ? `S/N ${a.serialNumber}` : undefined,
        })),
      );
      openLabelSheet(html);
    } finally {
      setPrintBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("mlTitle")}</CardTitle>
        </div>
        <CardDescription>{t("mlDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {project.assets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <span className="text-slate-500">
              {assetsWithoutQr.length > 0
                ? `${assetsWithoutQr.length} ${t("mlNoQrCountSuffix")}`
                : t("mlAllHaveQr")}
            </span>
            <button
              onClick={handlePrintAllLabels}
              disabled={printBusy}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Printer className="h-3.5 w-3.5" /> {printBusy ? t("mlPrintBusy") : t("mlPrintAllLabelsButton")}
            </button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-sm font-semibold">{t("mlNewOrderHeading")}</h4>
            {scannerSupported ? (
              <button
                onClick={() => {
                  setScannerOpen((v) => !v);
                  setScanMessage(null);
                  if (!scannerOpen) start();
                  else stop();
                }}
                className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <ScanLine className="h-3.5 w-3.5" /> {scannerOpen ? t("mlCloseScannerButton") : t("mlScanQrButton")}
              </button>
            ) : (
              <span className="ml-auto text-xs text-slate-400">{t("mlScannerNotSupported")}</span>
            )}
          </div>

          {scannerOpen && (
            <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Camera className="h-3.5 w-3.5" /> {t("mlAimCameraHint")}
                <button onClick={() => { setScannerOpen(false); stop(); }} className="ml-auto text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {active && <video ref={videoRef} className="mt-2 aspect-video w-full max-w-xs rounded-lg bg-black" muted playsInline />}
              {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            </div>
          )}
          {scanMessage && <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-400">{scanMessage}</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlDateLabel")}
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlWorkTypeLabel")}
              <select value={workType} onChange={(e) => setWorkType(e.target.value as MaintenanceWorkType)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                {WORK_TYPES.map((wt) => (
                  <option key={wt} value={wt}>{MAINTENANCE_WORK_TYPE_LABELS[wt]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlTechnicianLabel")}
              <input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} placeholder={t("mlTechnicianPlaceholder")} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlEquipmentLabel")}
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="">{t("mlNotLinkedOption")}</option>
                {project.assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.location ? ` (${a.location})` : ""}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
            {t("mlDescriptionLabel")}
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t("mlDescriptionPlaceholder")} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlPressureInLabel")}
              <input type="number" value={pressureInBar} onChange={(e) => setPressureInBar(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlPressureOutLabel")}
              <input type="number" value={pressureOutBar} onChange={(e) => setPressureOutBar(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlTempSupplyLabel")}
              <input type="number" value={tempSupplyC} onChange={(e) => setTempSupplyC(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              {t("mlLaborHoursLabel")}
              <input type="number" value={laborHours} onChange={(e) => setLaborHours(e.target.value === "" ? "" : Number(e.target.value))} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{t("mlMaterialsUsedLabel")}</span>
              <span className="ml-auto text-xs tabular-nums text-slate-400">{formatKzt(materialsCost)}</span>
            </div>
            {materials.map((m, i) => {
              const part = sparePartById.get(m.sparePartId);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex-1">{part?.name ?? m.sparePartId}</span>
                  <input
                    type="number"
                    value={m.quantity}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setMaterials((ms) => ms.map((x, idx) => (idx === i ? { ...x, quantity: qty } : x)));
                    }}
                    className="h-7 w-16 rounded-md border border-slate-200 bg-transparent px-1.5 text-right dark:border-slate-700"
                  />
                  <span className="text-slate-400">{part?.unit}</span>
                  <button onClick={() => setMaterials((ms) => ms.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            {project.spareParts.length > 0 && (
              <div className="flex items-center gap-2">
                <select value={materialToAdd} onChange={(e) => setMaterialToAdd(e.target.value)} className="h-8 flex-1 rounded-md border border-slate-200 bg-transparent px-1.5 text-xs dark:border-slate-700">
                  {project.spareParts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({t("mlStockSuffix")} {p.quantityOnHand} {p.unit})</option>
                  ))}
                </select>
                <button onClick={addMaterial} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-emerald-400 dark:border-slate-700">
                  <Plus className="h-3.5 w-3.5" /> {t("mlAddMaterialButton")}
                </button>
              </div>
            )}
          </div>

          <label className="mt-3 flex flex-col gap-1 text-xs text-slate-500">
            {t("mlCostItemLabel")}
            <select value={costItemId} onChange={(e) => setCostItemId(e.target.value)} className="h-9 max-w-md rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="">{t("mlNoBudgetOption")}</option>
              {maintenanceCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.code} {c.name}</option>
              ))}
            </select>
          </label>

          <button
            onClick={submit}
            disabled={!technicianName.trim() || !description.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t("mlSubmitButton")}
          </button>
        </div>

        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {recentLogs.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">{t("mlEmptyLog")}</p>
          )}
          {recentLogs.map((log) => {
            const cost = computeMaterialsCost(log.materialsUsed);
            const asset = log.assetId ? assetById.get(log.assetId) : undefined;
            return (
              <div key={log.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="w-24 shrink-0 text-xs tabular-nums text-slate-400">{log.date}</span>
                <Badge variant="outline">{MAINTENANCE_WORK_TYPE_LABELS[log.workType]}</Badge>
                {asset && <span className="text-xs text-slate-500">{asset.name}</span>}
                <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{log.description}</span>
                <span className="text-xs text-slate-400">{log.technicianName}</span>
                {cost > 0 && <span className="text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">{formatKzt(cost)}</span>}
                <button onClick={() => removeMaintenanceLog(log.id)} className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
