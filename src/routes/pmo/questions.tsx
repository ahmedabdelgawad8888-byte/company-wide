import { PmoEditor } from "@/features/pmo/editor";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatusPill } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PmoQuestion } from "@/lib/types";

function PmoQuestions() {
  const { db } = useApp();
  const { t } = useLang();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { pmoQuestions } = db;

  const statuses = ["Open", "Answered", "Deferred"] as const;

  const filtered = pmoQuestions.filter((q) => {
    return statusFilter === "all" || q.status === statusFilter;
  });

  // Summary
  const summary = {
    total: pmoQuestions.length,
    open: pmoQuestions.filter((q) => q.status === "Open").length,
    answered: pmoQuestions.filter((q) => q.status === "Answered").length,
    deferred: pmoQuestions.filter((q) => q.status === "Deferred").length,
  };

  return (
    <div className="space-y-6">
      <PmoEditor collection="pmoQuestions" />
      <PageHeader
        title={t("Open Questions", "الأسئلة المفتوحة")}
        subtitle={t(
          `${summary.open} open, ${summary.answered} answered`,
          `${summary.open} مفتوح، ${summary.answered} تم الإجابة عليها`,
        )}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold">{summary.total}</div>
          <div className="text-sm text-muted-foreground">
            {t("Total Questions", "إجمالي الأسئلة")}
          </div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{summary.open}</div>
          <div className="text-sm text-muted-foreground">{t("Open", "مفتوح")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{summary.answered}</div>
          <div className="text-sm text-muted-foreground">{t("Answered", "تم الإجابة")}</div>
        </Panel>
        <Panel className="p-4 text-center">
          <div className="text-3xl font-bold text-amber-600">{summary.deferred}</div>
          <div className="text-sm text-muted-foreground">{t("Deferred", "مؤجل")}</div>
        </Panel>
      </div>

      {/* Filters */}
      <Panel className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("Status:", "الحالة:")}</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All Statuses", "جميع الحالات")}</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      {/* Questions List */}
      <Panel className="p-4">
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((question) => (
            <AccordionItem key={question.id} value={question.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <Badge variant="outline" className="font-mono shrink-0">
                    {question.id}
                  </Badge>
                  <StatusPill status={question.status} />
                  <span className="font-medium">{question.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-4 space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("Owner:", "المسؤول:")}</span>{" "}
                      {question.owner}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("Raised:", "بتاريخ:")}</span>{" "}
                      {new Date(question.raisedDate).toLocaleDateString()}
                    </div>
                    {question.dueDate && (
                      <div>
                        <span className="text-muted-foreground">{t("Due:", "الاستحقاق:")}</span>{" "}
                        {new Date(question.dueDate).toLocaleDateString()}
                      </div>
                    )}
                    {question.relatedReq && (
                      <div>
                        <span className="text-muted-foreground">{t("Related:", "متعلق بـ:")}</span>{" "}
                        <Badge variant="outline" className="text-xs">
                          {question.relatedReq}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {t("Impact", "التأثير")}
                    </div>
                    <div className="text-sm bg-muted p-3 rounded">{question.impact}</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <p dir="rtl">{question.questionAr}</p>
                    <p>
                      {question.kind} · {t("Needed by", "مطلوب بحلول")}: {question.dueDate || "—"}
                    </p>
                    <p>{question.whyItMatters}</p>
                  </div>
                  {question.answer && (
                    <div>
                      <div className="text-sm font-medium text-green-600 mb-1">
                        {t("Answer", "الإجابة")}
                      </div>
                      <div className="text-sm bg-green-50 dark:bg-green-950 p-3 rounded border border-green-200 dark:border-green-800">
                        {question.answer}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/pmo/questions")({
  component: PmoQuestions,
});
