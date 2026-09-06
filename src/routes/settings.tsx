import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2,
  Coins,
  Database,
  Globe,
  Palette,
  RotateCcw,
  ShieldCheck,
  Stamp,
  BellRing,
  Bot,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, Section } from "@/components/kit";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { CADENCES, cadenceLabel } from "@/lib/calendar";
import type { AppSettings, Cadence, Currency, Notification } from "@/lib/types";
import {
  ConnectionSection,
  PermissionSection,
  ScheduleSection,
  VoiceSection,
} from "@/features/agent/agent-settings-sections";
import { AgentToolReference } from "@/features/agent/agent-tool-reference";

/* A settings row: label + description on the left, control on the right. */
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="w-full shrink-0 sm:w-56">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex sm:justify-end">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Picker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  // Radix resolves the trigger text on the client, so it renders blank during SSR.
  // Passing the label as a child makes the selected value visible on first paint.
  const current = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger>
        <SelectValue>{current?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const SECTIONS = [
  { key: "organisation", en: "Organisation", ar: "المؤسسة", icon: Building2 },
  { key: "localisation", en: "Language & region", ar: "اللغة والمنطقة", icon: Globe },
  { key: "appearance", en: "Appearance", ar: "المظهر", icon: Palette },
  { key: "notifications", en: "Notifications", ar: "الإشعارات", icon: BellRing },
  { key: "finance", en: "Finance", ar: "المالية", icon: Coins },
  { key: "approvals", en: "Approvals", ar: "الموافقات", icon: Stamp },
  { key: "security", en: "Security", ar: "الأمان", icon: ShieldCheck },
  { key: "data", en: "Data & exports", ar: "البيانات والتصدير", icon: Database },
  { key: "ai", en: "AI Agent", ar: "الوكيل الذكي", icon: Bot },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function SettingsPage() {
  const { db, actions, can } = useApp();
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const s = db.settings;
  const [tab, setTab] = useState<SectionKey>("organisation");

  const save = <K extends keyof AppSettings>(section: K, patch: Partial<AppSettings[K]>) =>
    actions.updateSettings(section, patch);
  const cadenceOptions = CADENCES.filter((c) => c !== "none").map((c) => ({
    value: c,
    label: t(cadenceLabel[c][0], cadenceLabel[c][1]),
  }));
  const admin = can("admin");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Settings", "الإعدادات")}
        subtitle={t(
          "Organisation profile, regional formats, appearance, notifications, finance rules, approvals, security and export defaults.",
          "ملف المؤسسة والتنسيقات الإقليمية والمظهر والإشعارات وقواعد المالية والموافقات والأمان وإعدادات التصدير.",
        )}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              actions.resetSettings();
              toast.success(t("Settings reset to defaults", "تمت إعادة الإعدادات الافتراضية"));
            }}
          >
            <RotateCcw className="size-4" /> {t("Reset to defaults", "إعادة الضبط")}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as SectionKey)}>
        <TabsList className="flex-wrap">
          {SECTIONS.map((sec) => (
            <TabsTrigger key={sec.key} value={sec.key} className="gap-1.5">
              <sec.icon className="size-3.5" /> {t(sec.en, sec.ar)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "organisation" ? (
        <Panel>
          <Section
            title={t("Organisation", "المؤسسة")}
            description={t(
              "Appears on exports, invoices and shared reports.",
              "تظهر في التصدير والفواتير والتقارير.",
            )}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="o-legal">{t("Legal name", "الاسم القانوني")}</Label>
                <Input
                  id="o-legal"
                  value={s.organisation.legalName}
                  onChange={(e) => save("organisation", { legalName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-trading">{t("Trading name", "الاسم التجاري")}</Label>
                <Input
                  id="o-trading"
                  value={s.organisation.tradingName}
                  onChange={(e) => save("organisation", { tradingName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-email">{t("Support email", "بريد الدعم")}</Label>
                <Input
                  id="o-email"
                  type="email"
                  value={s.organisation.supportEmail}
                  onChange={(e) => save("organisation", { supportEmail: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-phone">{t("Phone", "الهاتف")}</Label>
                <Input
                  id="o-phone"
                  value={s.organisation.phone}
                  onChange={(e) => save("organisation", { phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-web">{t("Website", "الموقع")}</Label>
                <Input
                  id="o-web"
                  value={s.organisation.website}
                  onChange={(e) => save("organisation", { website: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="o-tz">{t("Timezone", "المنطقة الزمنية")}</Label>
                <Input
                  id="o-tz"
                  value={s.organisation.timezone}
                  onChange={(e) => save("organisation", { timezone: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-2">
              <Row
                label={t("Base reporting currency", "عملة التقارير")}
                hint={t(
                  "Everything consolidates to this currency.",
                  "يتم توحيد كل شيء بهذه العملة.",
                )}
              >
                <Picker
                  value={s.organisation.baseCurrency}
                  onChange={(v) => save("organisation", { baseCurrency: v as Currency })}
                  options={db.entities.map((e) => ({ value: e.currency, label: e.currency }))}
                />
              </Row>
              <Row
                label={t("Default entity", "الكيان الافتراضي")}
                hint={t("Pre-selected when creating records.", "يُختار مسبقًا عند إنشاء السجلات.")}
              >
                <Picker
                  value={s.organisation.defaultEntityId}
                  onChange={(v) => save("organisation", { defaultEntityId: v })}
                  options={db.entities.map((e) => ({ value: e.id, label: e.name }))}
                />
              </Row>
              <Row
                label={t("Fiscal year starts", "بداية السنة المالية")}
                hint={t("Month and day, e.g. 01-01.", "الشهر واليوم، مثال ٠١-٠١.")}
              >
                <Input
                  value={s.organisation.fiscalYearStart}
                  onChange={(e) => save("organisation", { fiscalYearStart: e.target.value })}
                />
              </Row>
            </div>
          </Section>
        </Panel>
      ) : null}

      {tab === "localisation" ? (
        <Panel>
          <Section
            title={t("Language & region", "اللغة والمنطقة")}
            description={t(
              "Applies to dates, numbers and reading direction.",
              "تنطبق على التواريخ والأرقام واتجاه القراءة.",
            )}
          >
            <Row
              label={t("Interface language", "لغة الواجهة")}
              hint={t(
                "Arabic switches the whole app to right-to-left.",
                "العربية تحوّل التطبيق بالكامل من اليمين لليسار.",
              )}
            >
              <Picker
                value={lang}
                onChange={(v) => {
                  setLang(v as "en" | "ar");
                  save("localisation", { defaultLanguage: v as "en" | "ar" });
                }}
                options={[
                  { value: "en", label: "English" },
                  { value: "ar", label: "العربية" },
                ]}
              />
            </Row>
            <Row label={t("Date format", "تنسيق التاريخ")}>
              <Picker
                value={s.localisation.dateFormat}
                onChange={(v) => save("localisation", { dateFormat: v })}
                options={[
                  { value: "dd MMM yyyy", label: "04 Sep 2026" },
                  { value: "yyyy-MM-dd", label: "2026-09-04" },
                  { value: "dd/MM/yyyy", label: "04/09/2026" },
                ]}
              />
            </Row>
            <Row label={t("Number format", "تنسيق الأرقام")}>
              <Picker
                value={s.localisation.numberFormat}
                onChange={(v) => save("localisation", { numberFormat: v })}
                options={[
                  { value: "1,234.56", label: "1,234.56" },
                  { value: "1.234,56", label: "1.234,56" },
                ]}
              />
            </Row>
            <Row
              label={t("Week starts on", "بداية الأسبوع")}
              hint={t("Changes the calendar grid.", "يغيّر شبكة التقويم.")}
            >
              <Picker
                value={s.localisation.weekStart}
                onChange={(v) => save("localisation", { weekStart: v })}
                options={[
                  { value: "Saturday", label: t("Saturday", "السبت") },
                  { value: "Sunday", label: t("Sunday", "الأحد") },
                  { value: "Monday", label: t("Monday", "الاثنين") },
                ]}
              />
            </Row>
            <Row
              label={t("Mirror charts in Arabic", "عكس الرسوم في العربية")}
              hint={t(
                "Flips chart axes to match right-to-left reading.",
                "يعكس محاور الرسوم لتتوافق مع القراءة من اليمين.",
              )}
            >
              <Toggle
                id="rtl-charts"
                checked={s.localisation.rtlMirrorCharts}
                onChange={(v) => save("localisation", { rtlMirrorCharts: v })}
              />
            </Row>
          </Section>
        </Panel>
      ) : null}

      {tab === "appearance" ? (
        <Panel>
          <Section
            title={t("Appearance", "المظهر")}
            description={t(
              "Theme and layout density for your account.",
              "السمة وكثافة العرض لحسابك.",
            )}
          >
            <Row label={t("Theme", "السمة")}>
              <Picker
                value={theme === "dark" ? "dark" : "light"}
                onChange={(v) => {
                  setTheme(v as "light" | "dark");
                  save("appearance", { theme: v as "light" | "dark" });
                }}
                options={[
                  { value: "light", label: t("Light", "فاتح") },
                  { value: "dark", label: t("Dark", "داكن") },
                ]}
              />
            </Row>
            <Row
              label={t("Density", "الكثافة")}
              hint={t("Compact fits more rows on screen.", "المضغوط يعرض صفوفًا أكثر.")}
            >
              <Picker
                value={s.appearance.density}
                onChange={(v) => save("appearance", { density: v })}
                options={[
                  { value: "comfortable", label: t("Comfortable", "مريح") },
                  { value: "compact", label: t("Compact", "مضغوط") },
                ]}
              />
            </Row>
            <Row label={t("Collapse sidebar by default", "طي القائمة افتراضيًا")}>
              <Toggle
                id="ap-sidebar"
                checked={s.appearance.sidebarCollapsed}
                onChange={(v) => save("appearance", { sidebarCollapsed: v })}
              />
            </Row>
            <Row label={t("Show chart gridlines", "إظهار خطوط الشبكة")}>
              <Toggle
                id="ap-grid"
                checked={s.appearance.showChartGrid}
                onChange={(v) => save("appearance", { showChartGrid: v })}
              />
            </Row>
          </Section>
        </Panel>
      ) : null}

      {tab === "notifications" ? (
        <div className="space-y-4">
          <Panel>
            <Section
              title={t("Delivery", "التسليم")}
              description={t("How and when you are told about things.", "كيف ومتى يتم إبلاغك.")}
            >
              <Row label={t("In-app notifications", "إشعارات داخل التطبيق")}>
                <Toggle
                  id="n-inapp"
                  checked={s.notifications.channels.inApp}
                  onChange={(v) =>
                    save("notifications", { channels: { ...s.notifications.channels, inApp: v } })
                  }
                />
              </Row>
              <Row label={t("Email notifications", "إشعارات البريد")}>
                <Toggle
                  id="n-email"
                  checked={s.notifications.channels.email}
                  onChange={(v) =>
                    save("notifications", { channels: { ...s.notifications.channels, email: v } })
                  }
                />
              </Row>
              <Row
                label={t("Daily digest", "الملخص الدوري")}
                hint={t(
                  "One roll-up instead of individual alerts.",
                  "ملخص واحد بدل التنبيهات المتفرقة.",
                )}
              >
                <Toggle
                  id="n-digest"
                  checked={s.notifications.channels.digest}
                  onChange={(v) =>
                    save("notifications", { channels: { ...s.notifications.channels, digest: v } })
                  }
                />
              </Row>
              <Row label={t("Digest frequency", "تكرار الملخص")}>
                <Picker
                  value={s.notifications.digestCadence}
                  onChange={(v) => save("notifications", { digestCadence: v as Cadence })}
                  options={cadenceOptions}
                />
              </Row>
              <Row label={t("Digest time", "وقت الملخص")}>
                <Input
                  type="time"
                  value={s.notifications.digestTime}
                  onChange={(e) => save("notifications", { digestTime: e.target.value })}
                />
              </Row>
              <Row
                label={t("Quiet hours", "ساعات الهدوء")}
                hint={t(
                  "Nothing is delivered between these times.",
                  "لا يتم التسليم بين هذين الوقتين.",
                )}
              >
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={s.notifications.quietHoursStart}
                    onChange={(e) => save("notifications", { quietHoursStart: e.target.value })}
                  />
                  <Input
                    type="time"
                    value={s.notifications.quietHoursEnd}
                    onChange={(e) => save("notifications", { quietHoursEnd: e.target.value })}
                  />
                </div>
              </Row>
            </Section>
          </Panel>
          <Panel>
            <Section
              title={t("Categories", "التصنيفات")}
              description={t(
                "Turn off anything you do not want to hear about.",
                "أوقف ما لا ترغب في متابعته.",
              )}
            >
              {(Object.keys(s.notifications.categories) as Notification["category"][]).map((c) => (
                <Row key={c} label={c}>
                  <Toggle
                    id={`n-cat-${c}`}
                    checked={s.notifications.categories[c]}
                    onChange={(v) =>
                      save("notifications", {
                        categories: { ...s.notifications.categories, [c]: v },
                      })
                    }
                  />
                </Row>
              ))}
            </Section>
          </Panel>
        </div>
      ) : null}

      {tab === "finance" ? (
        <Panel>
          <Section
            title={t("Finance rules", "قواعد المالية")}
            description={t(
              "Invoice numbering, terms and approval thresholds.",
              "ترقيم الفواتير والشروط وحدود الموافقة.",
            )}
          >
            <Row label={t("Invoice prefix", "بادئة الفاتورة")}>
              <Input
                value={s.finance.invoicePrefix}
                onChange={(e) => save("finance", { invoicePrefix: e.target.value })}
              />
            </Row>
            <Row label={t("Next invoice number", "رقم الفاتورة التالي")}>
              <Input
                type="number"
                value={s.finance.nextInvoiceNumber}
                onChange={(e) =>
                  save("finance", { nextInvoiceNumber: Number(e.target.value) || 0 })
                }
              />
            </Row>
            <Row label={t("Default payment terms (days)", "شروط السداد الافتراضية (أيام)")}>
              <Input
                type="number"
                value={s.finance.defaultPaymentTermsDays}
                onChange={(e) =>
                  save("finance", { defaultPaymentTermsDays: Number(e.target.value) || 0 })
                }
              />
            </Row>
            <Row
              label={t("Overdue grace (days)", "مهلة التأخير (أيام)")}
              hint={t(
                "Days past due before an invoice is flagged.",
                "الأيام بعد الاستحقاق قبل وضع علامة التأخير.",
              )}
            >
              <Input
                type="number"
                value={s.finance.overdueGraceDays}
                onChange={(e) => save("finance", { overdueGraceDays: Number(e.target.value) || 0 })}
              />
            </Row>
            <Row label={t("Tax rate (%)", "نسبة الضريبة ٪")}>
              <Input
                type="number"
                value={s.finance.taxRatePercent}
                onChange={(e) => save("finance", { taxRatePercent: Number(e.target.value) || 0 })}
              />
            </Row>
            <Row
              label={t("Require approval above", "تتطلب موافقة أعلى من")}
              hint={t("Amount in base currency.", "المبلغ بالعملة الأساسية.")}
            >
              <Input
                type="number"
                value={s.finance.requireApprovalAbove}
                onChange={(e) =>
                  save("finance", { requireApprovalAbove: Number(e.target.value) || 0 })
                }
              />
            </Row>
            <Row
              label={t("Lock FX rate when issuing", "تثبيت سعر الصرف عند الإصدار")}
              hint={t(
                "Stops historic invoices re-translating.",
                "يمنع إعادة ترجمة الفواتير التاريخية.",
              )}
            >
              <Toggle
                id="f-fx"
                checked={s.finance.lockFxOnIssue}
                onChange={(v) => save("finance", { lockFxOnIssue: v })}
              />
            </Row>
          </Section>
        </Panel>
      ) : null}

      {tab === "approvals" ? (
        <Panel>
          <Section
            title={t("Approvals", "الموافقات")}
            description={t("Thresholds and escalation behaviour.", "الحدود وسلوك التصعيد.")}
          >
            <Row
              label={t("Two-step approval above", "موافقة من خطوتين أعلى من")}
              hint={t(
                "High-value items need a second approver.",
                "البنود عالية القيمة تحتاج موافقًا ثانيًا.",
              )}
            >
              <Input
                type="number"
                value={s.approvals.twoStepAboveValue}
                onChange={(e) =>
                  save("approvals", { twoStepAboveValue: Number(e.target.value) || 0 })
                }
              />
            </Row>
            <Row label={t("Auto-escalate after (days)", "تصعيد تلقائي بعد (أيام)")}>
              <Input
                type="number"
                value={s.approvals.autoEscalateAfterDays}
                onChange={(e) =>
                  save("approvals", { autoEscalateAfterDays: Number(e.target.value) || 0 })
                }
              />
            </Row>
            <Row
              label={t("Allow self-approval", "السماح بالموافقة الذاتية")}
              hint={t("Off is the safer default.", "الإيقاف هو الخيار الأكثر أمانًا.")}
            >
              <Toggle
                id="a-self"
                checked={s.approvals.allowSelfApproval}
                onChange={(v) => save("approvals", { allowSelfApproval: v })}
              />
            </Row>
            <Row label={t("Delegate when away", "التفويض أثناء الغياب")}>
              <Toggle
                id="a-deleg"
                checked={s.approvals.delegateWhenAway}
                onChange={(v) => save("approvals", { delegateWhenAway: v })}
              />
            </Row>
          </Section>
        </Panel>
      ) : null}

      {tab === "security" ? (
        <Panel>
          <Section
            title={t("Security", "الأمان")}
            description={
              admin
                ? t("Account protection and audit retention.", "حماية الحساب والاحتفاظ بالسجلات.")
                : t("These are managed by an administrator.", "تتم إدارتها بواسطة المسؤول.")
            }
          >
            <fieldset disabled={!admin} className={admin ? "" : "opacity-60"}>
              <Row label={t("Require two-factor authentication", "المصادقة الثنائية")}>
                <Toggle
                  id="s-2fa"
                  checked={s.security.enforceTwoFactor}
                  onChange={(v) => save("security", { enforceTwoFactor: v })}
                />
              </Row>
              <Row label={t("Session timeout (minutes)", "مهلة الجلسة (دقائق)")}>
                <Input
                  type="number"
                  value={s.security.sessionTimeoutMinutes}
                  onChange={(e) =>
                    save("security", { sessionTimeoutMinutes: Number(e.target.value) || 0 })
                  }
                />
              </Row>
              <Row label={t("Minimum password length", "الحد الأدنى لطول كلمة المرور")}>
                <Input
                  type="number"
                  value={s.security.passwordMinLength}
                  onChange={(e) =>
                    save("security", { passwordMinLength: Number(e.target.value) || 0 })
                  }
                />
              </Row>
              <Row
                label={t("IP allowlist", "قائمة IP المسموحة")}
                hint={t(
                  "Comma separated. Empty allows any address.",
                  "مفصولة بفواصل. الفراغ يسمح بأي عنوان.",
                )}
              >
                <Input
                  value={s.security.ipAllowlist}
                  onChange={(e) => save("security", { ipAllowlist: e.target.value })}
                  placeholder="10.0.0.0/8"
                />
              </Row>
              <Row label={t("Audit log retention (days)", "الاحتفاظ بسجل التدقيق (أيام)")}>
                <Input
                  type="number"
                  value={s.security.auditRetentionDays}
                  onChange={(e) =>
                    save("security", { auditRetentionDays: Number(e.target.value) || 0 })
                  }
                />
              </Row>
            </fieldset>
          </Section>
        </Panel>
      ) : null}

      {tab === "data" ? (
        <Panel>
          <Section
            title={t("Data & exports", "البيانات والتصدير")}
            description={t(
              "Defaults applied to CSV and PDF exports.",
              "الإعدادات الافتراضية للتصدير.",
            )}
          >
            <Row label={t("Brand exports with the Trygc logo", "إضافة شعار Trygc للتصدير")}>
              <Toggle
                id="d-brand"
                checked={s.data.exportBranding}
                onChange={(v) => save("data", { exportBranding: v })}
              />
            </Row>
            <Row label={t("CSV delimiter", "فاصل CSV")}>
              <Picker
                value={s.data.csvDelimiter}
                onChange={(v) => save("data", { csvDelimiter: v })}
                options={[
                  { value: ",", label: t("Comma", "فاصلة") },
                  { value: ";", label: t("Semicolon", "فاصلة منقوطة") },
                  { value: "\t", label: t("Tab", "مسافة جدولة") },
                ]}
              />
            </Row>
            <Row label={t("Include archived records", "تضمين السجلات المؤرشفة")}>
              <Toggle
                id="d-arch"
                checked={s.data.includeArchivedInExports}
                onChange={(v) => save("data", { includeArchivedInExports: v })}
              />
            </Row>
            <Row label={t("Backup frequency", "تكرار النسخ الاحتياطي")}>
              <Picker
                value={s.data.backupCadence}
                onChange={(v) => save("data", { backupCadence: v as Cadence })}
                options={cadenceOptions}
              />
            </Row>
          </Section>
        </Panel>
      ) : null}

      {tab === "ai" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <Section
              title={t("AI connection", "اتصال الوكيل الذكي")}
              description={t(
                "Provider, model, endpoint and credential used by the operating agent.",
                "المزود والنموذج ونقطة الاتصال وبيانات الاعتماد التي يستخدمها الوكيل التشغيلي.",
              )}
            >
              <ConnectionSection />
            </Section>
          </Panel>
          <Panel>
            <Section
              title={t("Action permissions", "صلاحيات الإجراءات")}
              description={t(
                "Choose which future agent tools run, ask first, or remain blocked.",
                "حدد أدوات الوكيل التي تعمل أو تطلب تأكيداً أو تظل محظورة.",
              )}
            >
              <PermissionSection />
            </Section>
          </Panel>
          <Panel>
            <Section
              title={t("Voice & scheduled briefs", "الصوت والملخصات المجدولة")}
              description={t(
                "Control dictation, spoken replies and recurring operating briefs.",
                "التحكم في الإملاء والردود الصوتية والملخصات التشغيلية المتكررة.",
              )}
            >
              <div className="space-y-6">
                <VoiceSection />
                <div className="border-t pt-5">
                  <ScheduleSection />
                </div>
              </div>
            </Section>
          </Panel>
          <Panel>
            <Section
              title={t("Tool catalogue", "دليل الأدوات")}
              description={t(
                "Review every operating capability and its current policy.",
                "راجع كل قدرة تشغيلية وسياستها الحالية.",
              )}
            >
              <AgentToolReference />
            </Section>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/settings")({ component: SettingsPage });
