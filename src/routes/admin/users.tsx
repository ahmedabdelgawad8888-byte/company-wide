import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, Pill, Section, Stat } from "@/components/kit";
import { DataTable, type Column } from "@/components/data-table";
import { useApp } from "@/lib/store";
import { useLang } from "@/lib/i18n";
import { shortDate } from "@/lib/format";
import type { User } from "@/lib/types";

function Users() {
  const { db, entityName, can, actions, activeWorkspace } = useApp();
  const { t } = useLang();
  const isAdmin = can("admin");
  const people = db.users;
  const active = people.filter((u) => u.status === "active");
  const departments = new Set(active.map((u) => u.department)).size;
  const entityCount = new Set(active.map((u) => u.entityId)).size;

  const columns: Column<User>[] = [
    {
      key: "name",
      header: t("Person", "الموظف"),
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-muted-foreground">{r.email}</div>
        </div>
      ),
      sortValue: (r) => r.name,
    },
    {
      key: "dept",
      header: t("Function", "القسم"),
      render: (r) => <Pill tone="brand">{r.department}</Pill>,
      sortValue: (r) => r.department,
    },
    {
      key: "role",
      header: t("Access profile", "نوع الوصول"),
      render: (r) => <span className="text-sm">{r.role}</span>,
      sortValue: (r) => r.role,
    },
    {
      key: "entity",
      header: t("Entity", "الكيان"),
      render: (r) => entityName(r.entityId),
      sortValue: (r) => entityName(r.entityId),
    },
    {
      key: "status",
      header: t("Account", "الحساب"),
      render: (r) => (
        <Pill
          tone={r.status === "active" ? "success" : r.status === "suspended" ? "danger" : "warning"}
        >
          {r.status}
        </Pill>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: "login",
      header: t("Last login", "آخر دخول"),
      render: (r) => shortDate(r.lastLogin),
      sortValue: (r) => r.lastLogin,
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        isAdmin ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const next = r.status === "active" ? "suspended" : "active";
              actions.setUserStatus(r.id, next);
              toast.success(
                next === "active"
                  ? t("Access restored", "تمت استعادة الوصول")
                  : t("Access suspended", "تم تعليق الوصول"),
                { description: r.name },
              );
            }}
          >
            {r.status === "active" ? t("Suspend", "تعليق") : t("Reactivate", "إعادة تفعيل")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{t("View only", "عرض فقط")}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          activeWorkspace === "hr"
            ? t("People Directory", "دليل الموظفين")
            : t("People & Access", "الموظفون والوصول")
        }
        subtitle={t(
          "A practical company directory for HR: who is active, where they work, and who needs an access follow-up. Account controls appear only to authorized admins.",
          "دليل عملي للموارد البشرية يوضح الموظفين النشطين وأقسامهم والاحتياجات المرتبطة بالوصول. أدوات التحكم تظهر فقط للمسؤولين المصرح لهم.",
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t("Active people", "الموظفون النشطون")}
          value={String(active.length)}
          tone="brand"
        />
        <Stat label={t("Functions", "الأقسام")} value={String(departments)} />
        <Stat label={t("Entities represented", "الكيانات")} value={String(entityCount)} />
        <Stat
          label={t("Access follow-up", "مراجعة الوصول")}
          value={String(people.filter((u) => u.status === "suspended").length)}
          tone={people.some((u) => u.status === "suspended") ? "warning" : "success"}
        />
      </div>
      <Section
        title={t("Company people", "موظفو الشركة")}
        description={t(
          "Search by person, function, role or entity. This page is intentionally directory-first rather than chart-heavy.",
          "ابحث بالاسم أو القسم أو نوع الوصول أو الكيان. الصفحة مصممة كدليل عملي بدون رسوم غير ضرورية.",
        )}
      >
        <DataTable
          rows={people}
          columns={columns}
          rowKey={(r) => r.id}
          searchable={(r) =>
            `${r.name} ${r.email} ${r.role} ${r.department} ${entityName(r.entityId)}`
          }
          exportName="trygc-people-directory"
          pageSize={15}
        />
      </Section>
    </div>
  );
}

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "People Directory | TryGC Workspace Hub" },
      {
        name: "description",
        content:
          "HR people directory and account-access visibility inside the TryGC Workspace Hub.",
      },
    ],
  }),
  component: Users,
});
