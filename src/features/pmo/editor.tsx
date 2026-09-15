import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "../../lib/store";
import { canEditPmo, validatePmoRecord, type PmoCollection } from "../../lib/pmo-management";
import * as baseline from "../../lib/data/pmo-seed";
import { useHub } from "../workspaces/provider";
import { workbookRecords } from "../workspaces/pmo-seed";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { control } from "../workspaces/record-form";
const collections: Record<PmoCollection, string> = {
  pmoRequirements: "Requirements",
  pmoE2EStages: "E2E stages",
  pmoMilestones: "Milestones",
  pmoRaidItems: "RAID items",
  pmoActions: "Actions",
  pmoQuestions: "Questions",
};
const label = (key: string) =>
  ({
    id: "ID",
    title: "Title",
    pmoStatus: "Delivery status",
    percentDone: "Progress (%)",
    effortDays: "Effort (days)",
    etaDate: "Finish date",
    ownerRole: "Owner",
    relatedReq: "Related requirement",
    relatedReqs: "Related requirements",
  })[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const choices: Record<string, string[]> = {
  pmoStatus: ["Verify & Close", "Not Started", "In Progress", "Blocked - Clarification", "Done"],
  docStatus: ["DONE", "NEW", "TBC"],
  priority: ["P0", "P1", "P2"],
  size: ["S", "M", "L", "XL"],
  wave: ["W0", "W1", "W2", "W3", "W4", "W5", "W6"],
  rag: ["", "green", "amber", "red"],
};
const statuses: Record<string, string[]> = {
  pmoMilestones: ["Not Started", "In Progress", "Completed", "At Risk"],
  pmoRaidItems: ["Open", "Mitigated", "Closed", "Accepted"],
  pmoActions: ["Open", "In Progress", "Closed", "Blocked"],
  pmoQuestions: ["Open", "Answered", "Deferred"],
};
export function PmoEditor({
  collection,
  recordId,
  onSaved,
}: {
  collection?: PmoCollection;
  recordId?: string | number;
  onSaved?: () => void;
}) {
  const { db, currentUser, actions } = useApp();
  const { transact } = useHub();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PmoCollection>(collection ?? "pmoRequirements");
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(false);
  if (!canEditPmo(currentUser)) return null;
  const rows = db[kind];
  const edit = (id: string, target = kind) => {
    setError("");
    setSelected(id);
    setPlan(false);
    const found = db[target].find((r) => String(r.id) === id);
    const fields = Object.assign(
      {},
      ...baseline[target].map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            Array.isArray(v) ? [] : typeof v === "number" ? 0 : "",
          ]),
        ),
      ),
    );
    setDraft(found ? { ...fields, ...structuredClone(found) } : null);
  };
  const show = () => {
    setOpen(true);
    setError("");
    if (recordId !== undefined) edit(String(recordId));
  };
  const create = () => {
    edit("");
    const template = Object.assign(
      {},
      ...baseline[kind].map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [
            k,
            Array.isArray(v) ? [] : typeof v === "number" ? 0 : "",
          ]),
        ),
      ),
    );
    Object.assign(template, {
      id:
        kind === "pmoE2EStages"
          ? Math.max(0, ...db.pmoE2EStages.map((r) => r.id)) + 1
          : `${kind.replace("pmo", "").toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`,
    });
    for (const key of Object.keys(template)) if (choices[key]) template[key] = choices[key][0];
    if ("status" in template) template.status = statuses[kind]?.[0] ?? "Open";
    setDraft(template);
  };
  const persist = (remove = false) => {
    try {
      if (!draft) return;
      const next = { ...db };
      if (plan) {
        const numberKeys = ["workingDaysPerWeek", "programDurationWeeks", "S", "M", "L", "XL"];
        if (
          !draft["planStartDate"] ||
          numberKeys.some((k) => !Number.isFinite(Number(draft[k])) || Number(draft[k]) <= 0) ||
          Number(draft["workingDaysPerWeek"]) > 7
        )
          throw new Error(
            "Enter a start date, positive plan values, and 1–7 working days per week.",
          );
        next.pmoPlanConfig = {
          planStartDate: String(draft["planStartDate"]),
          workingDaysPerWeek: Number(draft["workingDaysPerWeek"]),
          programDurationWeeks: Number(draft["programDurationWeeks"]),
          effortSizes: {
            S: Number(draft["S"]),
            M: Number(draft["M"]),
            L: Number(draft["L"]),
            XL: Number(draft["XL"]),
          },
        };
      } else {
        if (!remove) {
          validatePmoRecord(draft);
          if (!selected && rows.some((r) => String(r.id) === String(draft["id"])))
            throw new Error("This ID already exists.");
          const title =
            draft["title"] ??
            draft["name"] ??
            draft["description"] ??
            draft["action"] ??
            draft["question"];
          if (!String(title ?? "").trim()) throw new Error("Enter a title or description.");
        }
        const replacement = remove
          ? rows.filter((r) => String(r.id) !== selected)
          : selected
            ? rows.map((r) => (String(r.id) === selected ? draft : r))
            : [...rows, draft];
        Object.assign(next, { [kind]: replacement });
        if (remove && kind === "pmoRequirements") {
          next.pmoRequirements = next.pmoRequirements.map((r) => ({
            ...r,
            dependencies: r.dependencies.filter((id) => id !== selected),
          }));
          next.pmoActions = next.pmoActions.map((r) =>
            r.relatedReq === selected ? { ...r, relatedReq: "" } : r,
          );
          next.pmoQuestions = next.pmoQuestions.map((r) =>
            r.relatedReq === selected ? { ...r, relatedReq: "" } : r,
          );
          next.pmoRaidItems = next.pmoRaidItems.map((r) => ({
            ...r,
            relatedReqs: r.relatedReqs.filter((id) => id !== selected),
          }));
        }
      }
      const generated = workbookRecords(next);
      const previous = workbookRecords(db);
      transact((s) => {
        const before = JSON.stringify(db[kind]);
        for (const record of generated) {
          if (JSON.stringify(previous.find((r) => r.id === record.id)) === JSON.stringify(record))
            continue;
          const old = s.records.find((r) => r.id === record.id);
          if (old) Object.assign(old, record, { updatedAt: new Date().toISOString() });
          else s.records.push(record);
        }
        for (const record of s.records)
          if (
            previous.some((r) => r.id === record.id) &&
            !generated.some((r) => r.id === record.id)
          )
            record.archived = true;
        s.audit.unshift({
          id: crypto.randomUUID(),
          workspaceId: "pmo",
          recordId: selected || String(draft["id"] ?? "plan"),
          actorId: currentUser.id,
          action: remove ? "PMO record removed" : "PMO record saved",
          at: new Date().toISOString(),
          before,
          after: JSON.stringify(plan ? next.pmoPlanConfig : next[kind]),
        });
      });
      actions.updatePmoData({
        pmoRequirements: next.pmoRequirements,
        pmoE2EStages: next.pmoE2EStages,
        pmoMilestones: next.pmoMilestones,
        pmoRaidItems: next.pmoRaidItems,
        pmoActions: next.pmoActions,
        pmoQuestions: next.pmoQuestions,
        pmoPlanConfig: next.pmoPlanConfig,
      });
      setDraft(null);
      setSelected("");
      setOpen(false);
      onSaved?.();
      toast.success(remove ? "Record removed." : "Changes saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    }
  };
  return (
    <>
      <Button variant="outline" size="sm" onClick={show}>
        {recordId !== undefined
          ? "Edit / remove"
          : "Manage " + (collection ? collections[collection].toLowerCase() : "workspace data")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {plan ? "Edit delivery plan" : `Manage ${collections[kind].toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              Changes update the workspace views and are saved in this browser.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {!collection && (
              <select
                aria-label="Record type"
                className={control}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as PmoCollection);
                  setDraft(null);
                  setSelected("");
                  setPlan(false);
                }}
              >
                {Object.entries(collections).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Select record"
              className={control}
              value={selected}
              onChange={(e) => edit(e.target.value)}
            >
              <option value="">Select a record to edit</option>
              {rows.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {String(r.id)} ·{" "}
                  {String(
                    "title" in r
                      ? r.title
                      : "name" in r
                        ? r.name
                        : "action" in r
                          ? r.action
                          : "question" in r
                            ? r.question
                            : r.description,
                  )}
                </option>
              ))}
            </select>
            <Button onClick={create}>Add record</Button>
            {!collection && (
              <Button
                variant="outline"
                onClick={() => {
                  setPlan(true);
                  setSelected("");
                  setError("");
                  setDraft({ ...db.pmoPlanConfig, ...db.pmoPlanConfig.effortSizes });
                }}
              >
                Edit delivery plan
              </Button>
            )}
          </div>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {draft && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                persist();
              }}
              className="space-y-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(draft)
                  .filter(([, v]) => typeof v !== "object" || Array.isArray(v))
                  .map(([key, value]) => {
                    const options = choices[key] ?? (key === "status" ? statuses[kind] : undefined);
                    return (
                      <label key={key} className="text-sm space-y-1">
                        <span>{label(key)}</span>
                        {options ? (
                          <select
                            aria-label={label(key)}
                            className={control}
                            value={String(value)}
                            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                          >
                            {[...new Set([...options, String(value)])].map((v) => (
                              <option key={v} value={v}>
                                {v || "Not set"}
                              </option>
                            ))}
                          </select>
                        ) : /description|criteria|notes|question|answer|mitigation|clarification|impactIf|whyIt|action$/i.test(
                            key,
                          ) ? (
                          <textarea
                            aria-label={label(key)}
                            className={control + " min-h-24"}
                            value={String(value ?? "")}
                            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                          />
                        ) : (
                          <Input
                            aria-label={label(key)}
                            disabled={key === "id" && !!selected}
                            type={
                              typeof value === "number"
                                ? "number"
                                : /Date$/.test(key)
                                  ? "date"
                                  : "text"
                            }
                            step="any"
                            value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                [key]: Array.isArray(value)
                                  ? e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  : typeof value === "number"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              })
                            }
                          />
                        )}
                      </label>
                    );
                  })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit">Save changes</Button>
                {selected && !plan && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Remove this record? Requirement links will be cleared; audit history is retained.",
                        )
                      )
                        persist(true);
                    }}
                  >
                    Remove record
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
