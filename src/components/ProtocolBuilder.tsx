"use client";

import { useMemo, useState } from "react";
import { FileText, Gavel, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineText } from "@/components/InlineEdit";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useActiveProject, useActiveTariff } from "@/store/hooks";
import { computeAgendaItemResult, computeQuorum } from "@/lib/calculator/ownerRegistryEngine";
import { computeAllWear, computeReplacementPlan } from "@/lib/calculator/wearEngine";
import { computeCapitalRepairAnnual } from "@/lib/calculator/engine";
import { findMinTariff } from "@/lib/calculator/minTariffs";
import { downloadBlob } from "@/lib/export/download";
import { useT } from "@/lib/i18n/useT";
import { MEETING_FORMAT_LABELS, UNIT_TYPE_LABELS, type MeetingFormat, type VoteChoice } from "@/lib/calculator/types";

const CURRENT_YEAR = new Date().getFullYear();
const CAPITAL_PLAN_HORIZON = 5;

export function ProtocolBuilder() {
  const t = useT();
  const VOTE_LABELS: Record<VoteChoice, string> = {
    for: t("pbForLabel"),
    against: t("pbAgainstLabel"),
    abstain: t("pbAbstainLabel"),
  };
  const project = useActiveProject();
  const tariff = useActiveTariff();
  const createMeeting = useProjectsStore((s) => s.createMeeting);
  const updateMeeting = useProjectsStore((s) => s.updateMeeting);
  const removeMeeting = useProjectsStore((s) => s.removeMeeting);
  const setParticipant = useProjectsStore((s) => s.setParticipant);
  const markAllPresent = useProjectsStore((s) => s.markAllPresent);
  const addAgendaItem = useProjectsStore((s) => s.addAgendaItem);
  const updateAgendaItem = useProjectsStore((s) => s.updateAgendaItem);
  const removeAgendaItem = useProjectsStore((s) => s.removeAgendaItem);
  const setVote = useProjectsStore((s) => s.setVote);

  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(project.meetings[0]?.id ?? null);
  const [exportBusy, setExportBusy] = useState(false);

  const meeting = project.meetings.find((m) => m.id === activeMeetingId) ?? null;
  const quorum = useMemo(() => (meeting ? computeQuorum(project.units, meeting) : null), [project.units, meeting]);

  function handleCreateMeeting() {
    const id = createMeeting(t("pbNewMeetingTitle"), new Date().toISOString().slice(0, 10), "in_person");
    setActiveMeetingId(id);
  }

  async function handleExportProtocol() {
    if (!meeting) return;
    setExportBusy(true);
    try {
      const { exportProtocolToDocxBlob } = await import("@/lib/export/exportProtocolToDocx");
      const wears = computeAllWear(project.assets, CURRENT_YEAR);
      const plan = computeReplacementPlan(project.assets, wears, CURRENT_YEAR, CAPITAL_PLAN_HORIZON);
      const capitalPlanTotalNeed = plan.reduce((sum, y) => sum + y.totalCost, 0);
      const annualCapitalIncome = computeCapitalRepairAnnual(project.building, project.db.taxRates.mrpValue);

      const blob = await exportProtocolToDocxBlob({
        building: project.building,
        meeting,
        units: project.units,
        assets: project.assets,
        maintenanceTasks: project.maintenanceTasks,
        tariff,
        minTariff: findMinTariff(project.building.region),
        capitalFundBalance: project.capitalFundBalance,
        annualCapitalIncome,
        capitalPlanTotalNeed,
        capitalPlanHorizonYears: CAPITAL_PLAN_HORIZON,
      });
      downloadBlob(blob, `Протокол_${meeting.title.replace(/[^\p{L}\p{N}]+/gu, "_")}.docx`);
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-emerald-600" />
          <CardTitle>{t("pbTitle")}</CardTitle>
        </div>
        <CardDescription>{t("pbDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {project.units.length === 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {t("pbEmptyRegistryWarning")}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeMeetingId ?? ""}
            onChange={(e) => setActiveMeetingId(e.target.value || null)}
            className="h-9 min-w-[14rem] rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">{t("pbSelectMeetingOption")}</option>
            {project.meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({m.meetingDate})
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateMeeting}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
          >
            <Plus className="h-4 w-4" /> {t("pbNewMeetingButton")}
          </button>
          {meeting && (
            <button
              onClick={() => {
                removeMeeting(meeting.id);
                setActiveMeetingId(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t("pbDeleteMeetingButton")}
            </button>
          )}
        </div>

        {meeting && quorum && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <InlineText
                value={meeting.title}
                onChange={(v) => updateMeeting(meeting.id, { title: v })}
                className="min-w-[16rem] flex-1 font-medium"
              />
              <input
                type="date"
                value={meeting.meetingDate}
                onChange={(e) => updateMeeting(meeting.id, { meetingDate: e.target.value })}
                className="h-8 rounded-md border border-slate-200 bg-transparent px-1.5 text-sm dark:border-slate-700"
              />
              <select
                value={meeting.format}
                onChange={(e) => updateMeeting(meeting.id, { format: e.target.value as MeetingFormat })}
                className="h-8 rounded-md border border-slate-200 bg-transparent px-1.5 text-sm dark:border-slate-700"
              >
                {(Object.keys(MEETING_FORMAT_LABELS) as MeetingFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {MEETING_FORMAT_LABELS[f]}
                  </option>
                ))}
              </select>
              <InlineText
                value={meeting.chair ?? ""}
                onChange={(v) => updateMeeting(meeting.id, { chair: v || undefined })}
                className="w-40"
                placeholder={t("pbChairPlaceholder")}
              />
              <InlineText
                value={meeting.secretary ?? ""}
                onChange={(v) => updateMeeting(meeting.id, { secretary: v || undefined })}
                className="w-36"
                placeholder={t("pbSecretaryPlaceholder")}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <span>
                {t("pbPresentPrefix")} <b>{quorum.presentArea.toLocaleString("ru-RU")}</b> {t("pbOfPrefix")}{" "}
                <b>{quorum.totalArea.toLocaleString("ru-RU")}</b> м² (<b>{quorum.quorumPercent}%</b>)
              </span>
              <Badge variant={quorum.quorumMet ? "success" : "danger"}>
                {quorum.quorumMet ? t("pbQuorumMet") : t("pbQuorumNotMet")}
              </Badge>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => markAllPresent(meeting.id, true)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-emerald-400 dark:border-slate-700"
                >
                  {t("pbMarkAllPresentButton")}
                </button>
                <button
                  onClick={() => markAllPresent(meeting.id, false)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:border-rose-300 dark:border-slate-700"
                >
                  {t("pbUnmarkAllButton")}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <h4 className="mb-1 text-sm font-semibold">{t("pbParticipantsHeading")}</h4>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto text-sm">
                {project.units.map((u) => {
                  const participant = meeting.participants.find((p) => p.unitId === u.id);
                  const present = participant?.present ?? false;
                  return (
                    <label key={u.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-900">
                      <input
                        type="checkbox"
                        checked={present}
                        onChange={(e) => setParticipant(meeting.id, u.id, { present: e.target.checked })}
                      />
                      <Badge variant="outline">{UNIT_TYPE_LABELS[u.unitType]}</Badge>
                      <span className="w-16">{u.number}</span>
                      <span className="flex-1 truncate text-slate-500">{u.ownerName || "—"}</span>
                      <span className="text-xs tabular-nums text-slate-400">{u.area} м²</span>
                    </label>
                  );
                })}
                {project.units.length === 0 && <p className="py-2 text-center text-xs text-slate-400">{t("pbEmptyRegistryShort")}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold">{t("pbAgendaHeading")}</h4>
                <button
                  onClick={() => addAgendaItem(meeting.id, { title: t("pbNewQuestionTitle"), majorityRule: "simple" })}
                  className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("pbAddQuestionButton")}
                </button>
              </div>

              {meeting.agendaItems.length === 0 && (
                <p className="text-center text-xs text-slate-400">{t("pbEmptyAgenda")}</p>
              )}

              {meeting.agendaItems.map((item) => {
                const result = computeAgendaItemResult(project.units, meeting, item);
                const presentUnits = project.units.filter((u) =>
                  meeting.participants.some((p) => p.unitId === u.id && p.present),
                );
                return (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <InlineText
                        value={item.title}
                        onChange={(v) => updateAgendaItem(meeting.id, item.id, { title: v })}
                        className="min-w-[12rem] flex-1 font-medium"
                      />
                      <select
                        value={item.majorityRule}
                        onChange={(e) => updateAgendaItem(meeting.id, item.id, { majorityRule: e.target.value as "simple" | "qualified" })}
                        className="h-8 rounded-md border border-slate-200 bg-transparent px-1.5 text-xs dark:border-slate-700"
                      >
                        <option value="simple">{t("pbSimpleMajorityOption")}</option>
                        <option value="qualified">{t("pbQualifiedMajorityOption")}</option>
                      </select>
                      <Badge variant={result.passed ? "success" : "danger"}>{result.passed ? t("pbPassed") : t("pbNotPassed")}</Badge>
                      <button
                        onClick={() => removeAgendaItem(meeting.id, item.id)}
                        className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      {t("pbForLabel")} {result.forArea.toLocaleString("ru-RU")} м² ({result.forPercentOfPresent}%) · {t("pbAgainstLabel")}{" "}
                      {result.againstArea.toLocaleString("ru-RU")} м² · {t("pbAbstainLabel")} {result.abstainArea.toLocaleString("ru-RU")} м² · {t("pbThresholdLabel")}{" "}
                      {result.thresholdPercent}%
                    </p>

                    {presentUnits.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {presentUnits.map((u) => {
                          const vote = meeting.votes.find((v) => v.agendaItemId === item.id && v.unitId === u.id);
                          return (
                            <div key={u.id} className="flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-1 text-xs dark:border-slate-700">
                              <span className="text-slate-400">{u.number}</span>
                              {(["for", "against", "abstain"] as VoteChoice[]).map((choice) => (
                                <button
                                  key={choice}
                                  onClick={() => setVote(meeting.id, item.id, u.id, choice)}
                                  className={`rounded px-1.5 py-0.5 ${
                                    vote?.choice === choice
                                      ? choice === "for"
                                        ? "bg-emerald-600 text-white"
                                        : choice === "against"
                                          ? "bg-rose-600 text-white"
                                          : "bg-slate-500 text-white"
                                      : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {VOTE_LABELS[choice]}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleExportProtocol}
              disabled={exportBusy}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> {exportBusy ? t("pbExportBusy") : t("pbExportButton")}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
