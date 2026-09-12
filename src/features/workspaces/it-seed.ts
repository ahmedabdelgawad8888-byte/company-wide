import type { WorkspaceId } from "../../lib/workspace-hub";
import { dayOffset, today, type Actor, type HubState, type Kind, type WorkRecord } from "./model";

const IT_WORKSPACE: WorkspaceId = "it";
const PRIMARY_OWNER = "it-mahmoud";
const BACKUP_OWNER = "u13";

type RoutineSeed = {
  title: string;
  cadence: "Daily" | "Weekly" | "Monthly";
  schedule?: string;
  basis: "Confirmed" | "Proposed" | "Active-period confirmed";
  evidence: string;
  portfolio: string;
};

const portfolios = [
  "Infrastructure & Connectivity",
  "Backup & Disaster Recovery",
  "Systems, Automation & Development",
  "IT Asset & Device Management",
  "Onboarding & Offboarding",
  "Accounts & Access Governance",
  "WhatsApp & Social Media Systems",
  "Cloud Storage & File Management",
  "Finance, Subscriptions & Vendors",
  "IT Governance, Documentation & Training",
];

const daily: RoutineSeed[] = [
  {
    title: "Router connectivity and bandwidth test",
    cadence: "Daily",
    schedule: "08:30",
    basis: "Confirmed",
    evidence: "Test result, latency, packet loss, bandwidth and incident reference",
    portfolio: portfolios[0]!,
  },
  {
    title: "Veeam backup status check",
    cadence: "Daily",
    schedule: "09:30",
    basis: "Confirmed",
    evidence: "Job status, failed jobs, affected server and corrective action",
    portfolio: portfolios[1]!,
  },
  {
    title: "Critical infrastructure health check",
    cadence: "Daily",
    basis: "Proposed",
    evidence: "DC, storage, internet, firewall and monitoring status",
    portfolio: portfolios[0]!,
  },
  {
    title: "IT ticket and task queue review",
    cadence: "Daily",
    schedule: "10:00",
    basis: "Proposed",
    evidence: "Priorities confirmed, owners assigned and blockers escalated",
    portfolio: portfolios[9]!,
  },
  {
    title: "Onboarding and offboarding request check",
    cadence: "Daily",
    basis: "Proposed",
    evidence: "Requests received and accounts, devices and access status",
    portfolio: portfolios[4]!,
  },
  {
    title: "High-priority incident follow-up",
    cadence: "Daily",
    basis: "Proposed",
    evidence: "Latest update, next action, ETA and escalation",
    portfolio: portfolios[0]!,
  },
  {
    title: "Device, recording and monitoring alert review",
    cadence: "Daily",
    basis: "Proposed",
    evidence: "Monitoring alert status and response",
    portfolio: portfolios[3]!,
  },
  {
    title: "Daily task updates",
    cadence: "Daily",
    schedule: "Before end of shift",
    basis: "Proposed",
    evidence: "Status, progress, next action and blocker",
    portfolio: portfolios[9]!,
  },
  {
    title: "WhatsApp and Meta number verification follow-up",
    cadence: "Daily",
    basis: "Active-period confirmed",
    evidence: "Verification result and updated inventory",
    portfolio: portfolios[6]!,
  },
  {
    title: "Group organization and access review",
    cadence: "Daily",
    basis: "Active-period confirmed",
    evidence: "Groups classified and owners and access documented",
    portfolio: portfolios[5]!,
  },
  {
    title: "IT daily operations meeting",
    cadence: "Daily",
    schedule: "10:00 · Saturday–Thursday",
    basis: "Proposed",
    evidence: "Daily agenda, assigned actions, approvals and escalations",
    portfolio: portfolios[9]!,
  },
];

const weekly: RoutineSeed[] = [
  ["Review all open, stale and overdue IT work", "Saturday", "Weekly priority list", 9],
  ["Backup restore spot test", "Weekly", "Restore-test evidence", 1],
  ["Monitoring tools verification", "Weekly", "Monitoring coverage and missing-agent report", 0],
  [
    "Branch asset inventory reconciliation",
    "Weekly until stabilized",
    "Differences and corrective actions",
    3,
  ],
  [
    "WhatsApp, social-media and shared-access review",
    "Weekly",
    "Restricted, disabled, unowned and unauthorized access list",
    6,
  ],
  ["Onboarding and offboarding reconciliation with HR", "Weekly", "HR-versus-IT exception list", 4],
  [
    "Failed ticket and unresolved incident review",
    "Weekly",
    "Root causes and escalation actions",
    0,
  ],
  ["Team workload and ownership review", "Weekly", "Reassignment or capacity decisions", 9],
  [
    "Projects and development deployment review",
    "Weekly",
    "Milestone, risk, blocker and next-action report",
    2,
  ],
  [
    "Shared-folder and storage review",
    "Weekly",
    "Large, duplicated or incorrectly shared content",
    7,
  ],
  ["IT systems change review", "Weekly", "Changes deployed, failed changes and rollback status", 2],
  [
    "Weekly IT management report",
    "Thursday",
    "Completed, carried forward, blocked and next-week work",
    9,
  ],
].map(([title, schedule, evidence, portfolio]) => ({
  title: String(title),
  cadence: "Weekly" as const,
  schedule: String(schedule),
  basis: "Proposed" as const,
  evidence: String(evidence),
  portfolio: portfolios[Number(portfolio)]!,
}));

const monthly: RoutineSeed[] = [
  ["Full backup restore validation", "Signed restore-test report", 1],
  [
    "Asset inventory reconciliation by branch",
    "Missing, duplicate, unassigned and retired asset report",
    3,
  ],
  [
    "User account and access review",
    "Active users, leavers, excessive access and shared credentials",
    5,
  ],
  [
    "Platform ownership review",
    "Microsoft, Google, GitHub, pCloud, Dropbox and business-system ownership exceptions",
    5,
  ],
  [
    "Firewall, VLAN, DHCP and branch connectivity review",
    "Network configuration and health report",
    0,
  ],
  ["Server and storage capacity review", "Disk usage, growth, risks and required purchases", 0],
  [
    "Subscription and invoice reconciliation",
    "Active subscriptions, owners, cost, renewal and payment method",
    8,
  ],
  ["Mobile and MDM compliance review", "Enrolled, noncompliant, offline and unmanaged devices", 3],
  [
    "Social-media and WhatsApp account audit",
    "Active, disabled, restricted and unowned accounts",
    6,
  ],
  ["Patch and endpoint health review", "Missing patches and unsupported devices", 3],
  ["SOP and documentation review", "Documents requiring revision", 9],
  ["Monthly KPI report", "SLA, completion, overdue, aging, workload and routine compliance", 9],
  ["Vendor and platform review", "Open support cases, service problems and renewals", 8],
  [
    "Disaster-recovery readiness review",
    "Backup coverage, last restore, responsible owner and gaps",
    1,
  ],
].map(([title, evidence, portfolio]) => ({
  title: String(title),
  cadence: "Monthly" as const,
  schedule: "Month end",
  basis: "Proposed" as const,
  evidence: String(evidence),
  portfolio: portfolios[Number(portfolio)]!,
}));

const processes = [
  ["IT helpdesk and user support", 9],
  ["Incident ownership, communication and escalation", 0],
  ["Infrastructure and connectivity monitoring", 0],
  ["Backup monitoring and failed-job remediation", 1],
  ["Endpoint, mobile and MDM management", 3],
  ["IT asset lifecycle management", 3],
  ["Onboarding and offboarding", 4],
  ["User accounts, permissions and access governance", 5],
  ["Server, firewall and network administration", 0],
  ["System development, testing and deployment", 2],
  ["Attendance, HR and asset-system support", 2],
  ["WhatsApp and social-media account governance", 6],
  ["pCloud, Dropbox and shared-folder management", 7],
  ["Recording, camera and fingerprint-system support", 3],
  ["Documentation and knowledge-base maintenance", 9],
  ["Vendor, subscription and invoice follow-up", 8],
  ["IT staff coaching and technical training", 9],
  ["Task-quality and data-quality auditing", 9],
] as const;

const sopSeeds = [
  {
    title: "SOP-01 · Daily router test",
    trigger: "Daily at 08:30",
    purpose: "Confirm that branch internet and network performance are operational.",
    tools: "Router administration, gateway test and approved bandwidth test",
    procedure:
      "1. Identify the scheduled branch/router.\n2. Confirm router reachability.\n3. Test gateway and external connectivity.\n4. Record latency, packet loss, download and upload speed.\n5. Compare with the approved baseline.\n6. Review bandwidth use and unusual traffic.\n7. Attach a healthy result or open an incident/data issue.\n8. Assign an owner, next action and ETA.\n9. Escalate complete outages immediately.",
    evidence: "Screenshot or exported result with date, branch and tester.",
    success: "Router reachable, internet available and measurements within approved thresholds.",
    escalation: "Create an incident for degradation; escalate complete outages immediately.",
    systems: "Routers, ISP links, monitoring and incident register",
  },
  {
    title: "SOP-02 · Daily Veeam backup check",
    trigger: "Daily at 09:30",
    purpose: "Detect failed or incomplete backups before they become recovery risks.",
    tools: "Veeam management console and backup repositories",
    procedure:
      "1. Review jobs since the previous check.\n2. Classify each as Success, Warning, Failed or Not Run.\n3. Identify affected servers and errors.\n4. Confirm repository access and capacity.\n5. Retry only when cause and impact are understood.\n6. Open an incident for unresolved failures.\n7. Record evidence and corrective action.\n8. Escalate repeated failures or lost coverage.\n9. Complete only after every exception is documented.",
    evidence: "Backup-job summary and incident links.",
    success: "All expected jobs succeeded or have an owned exception.",
    escalation: "Escalate repeated failures or any loss of backup coverage.",
    systems: "Veeam, repositories, servers and incident register",
  },
  {
    title: "SOP-03 · IT daily operations meeting",
    trigger: "Saturday–Thursday at 10:00; 15-minute limit",
    purpose: "Align the team on priorities, ownership and blockers.",
    tools: "Workspace dashboard, task queue and calendar",
    procedure:
      "1. Review active, overdue and high-priority tasks.\n2. Confirm incidents and recurring checks.\n3. Review yesterday’s commitments.\n4. Identify today’s top priorities.\n5. Confirm one primary owner per action.\n6. Review waiting items and approvals.\n7. Escalate management blockers.\n8. Confirm onboarding/offboarding requests.\n9. Record decisions and due dates.\n10. Publish the daily plan.",
    evidence: "Daily agenda, actions, approvals and escalations.",
    success: "Every priority has one owner, due date and next action.",
    escalation: "Escalate unresolved authority, dependency and resource blockers.",
    systems: "Tasks, blockers, approvals and calendar",
  },
  {
    title: "SOP-04 · Employee onboarding",
    trigger: "Approved HR onboarding request",
    purpose: "Provide a secure, complete and verified technology setup for each joiner.",
    tools: "HR approval, identity platforms, asset register, MDM and business systems",
    procedure:
      "1. Verify employee, branch, department, position and start date.\n2. Prepare and register devices.\n3. Apply the approved baseline.\n4. Create accounts and licences.\n5. Assign role-approved access.\n6. Configure email, communications and business apps.\n7. Apply security, firewall, backup and MDM policies.\n8. Test access and applications.\n9. Obtain employee or manager confirmation.\n10. Update asset and access registers.\n11. Close with setup evidence.",
    evidence: "Approved request, asset identifiers, account checklist and confirmation.",
    success: "All devices, accounts, licences and access are working and confirmed.",
    escalation:
      "Do not close while any device, account, licence, access or confirmation is pending.",
    systems: "HR, identity, email, MDM, asset and access registers",
  },
  {
    title: "SOP-05 · Employee offboarding",
    trigger: "Approved HR or management request",
    purpose: "Remove access, recover assets and preserve business data at the approved time.",
    tools: "HR approval, identity platforms, asset register and business systems",
    procedure:
      "1. Confirm effective date and urgency.\n2. Disable interactive access at the approved time.\n3. Revoke sessions, VPN, email, cloud, GitHub and business access.\n4. Transfer file, email and system ownership.\n5. Recover devices and accessories.\n6. Preserve data per policy.\n7. Remove group and shared-resource access.\n8. Update asset and access registers.\n9. Obtain HR/manager confirmation and close with evidence.",
    evidence: "Revocation, ownership transfer, recovered asset and confirmation records.",
    success: "No active access remains; assets and ownership are accounted for.",
    escalation: "Missing device, missing ownership destination or continued active access.",
    systems: "HR, identity, VPN, email, cloud, GitHub and asset register",
  },
  {
    title: "SOP-06 · Asset inventory reconciliation",
    trigger: "Weekly until stable; monthly thereafter",
    purpose: "Keep the asset register aligned with physical and remotely observed devices.",
    tools: "Asset register, MDM/RMM and branch verification",
    procedure:
      "1. Export the asset register.\n2. Validate each device physically or remotely.\n3. Confirm serial, hostname, branch, location and assignee.\n4. Identify missing, duplicate, unused or incorrect assets.\n5. Verify condition and last contact.\n6. Correct approved records.\n7. Create actions for unresolved differences.\n8. Produce a branch exception report.\n9. Obtain owner confirmation and retain evidence.",
    evidence: "Dated export, validation evidence, exception report and owner confirmation.",
    success:
      "Every asset is uniquely identified, assigned and recently verified, or has an owned exception.",
    escalation: "Escalate missing equipment and unexplained assignment differences.",
    systems: "Asset register, MDM/RMM and branch inventories",
  },
  {
    title: "SOP-07 · Account and access review",
    trigger: "Monthly and after high-risk staffing changes",
    purpose: "Ensure access matches active employment and approved roles.",
    tools: "Platform user exports, HR roster and access register",
    procedure:
      "1. Export users and memberships.\n2. Compare with active employees and approved roles.\n3. Identify leavers, dormant users and excessive access.\n4. Identify ownerless shared accounts.\n5. Review administrator and ownership privileges.\n6. Submit changes for approval.\n7. Apply approved changes.\n8. Verify corrections.\n9. Save before/after evidence.\n10. Escalate unexplained privileged access immediately.",
    evidence: "Exports, exception list, approvals and before/after proof.",
    success: "All access is current, least-privileged and attributable to an owner.",
    escalation: "Escalate unexplained privileged access immediately.",
    systems: "Microsoft, Google, GitHub, cloud storage and business systems",
  },
  {
    title: "SOP-08 · Incident handling and escalation",
    trigger: "Service issue or operational alert",
    purpose: "Restore service safely while maintaining ownership, communication and evidence.",
    tools: "Monitoring, ticketing, communications and system consoles",
    procedure:
      "1. Log reporter, time, system, branch and impact.\n2. Set severity and priority.\n3. Assign one primary owner.\n4. Record symptoms separately from assumptions.\n5. Perform initial diagnosis.\n6. Restore service using the safest approved action.\n7. Communicate status and ETA.\n8. Escalate when authority, vendor or another team is required.\n9. Validate recovery.\n10. Document cause, resolution and prevention.\n11. Close only after verification.",
    evidence: "Incident timeline, diagnostics, communications and recovery validation.",
    success: "Service is verified, stakeholders informed and prevention is owned.",
    escalation: "Escalate by severity when authority, vendor support or another team is required.",
    systems: "Monitoring, ticketing, communications and affected platforms",
  },
  {
    title: "SOP-09 · Change and deployment management",
    trigger: "Approved production or infrastructure change",
    purpose:
      "Deliver controlled changes with testing, approval, validation and rollback readiness.",
    tools: "Change record, source control, staging, backup and deployment tooling",
    procedure:
      "1. Define change and business reason.\n2. Identify systems and users.\n3. Document prerequisites, dependencies and risks.\n4. Prepare backup and rollback.\n5. Test in staging when available.\n6. Obtain approval.\n7. Schedule implementation.\n8. Deploy and record exact changes.\n9. Run technical and user validation.\n10. Roll back when acceptance checks fail.\n11. Document outcome and close related work.",
    evidence: "Approval, test result, deployment log, validation and rollback status.",
    success: "Acceptance checks pass and the change is fully documented.",
    escalation:
      "Stop or roll back when acceptance checks fail; escalate business-impacting failures.",
    systems: "Source control, staging, production, monitoring and change register",
  },
  {
    title: "SOP-10 · Monthly IT operational review",
    trigger: "Month end",
    purpose:
      "Produce a trusted management view of IT performance, workload, control compliance and risk.",
    tools: "Workspace reports, task history, routine logs and exception registers",
    procedure:
      "1. Validate and clean task records.\n2. Separate projects, support and recurring executions.\n3. Calculate completed, active, waiting, held and overdue work.\n4. Review SLA and aging.\n5. Review routine compliance.\n6. Review backup, infrastructure, asset, access and security exceptions.\n7. Review workload by owner.\n8. Summarize improvements.\n9. Identify unresolved risks and decisions.\n10. Publish the report and next-month priorities.",
    evidence: "Published monthly report, KPI extracts and exception links.",
    success: "Management receives a reconciled report with owned risks and next priorities.",
    escalation: "Escalate material control gaps, missing evidence and unowned risks.",
    systems: "Tasks, routines, reports, assets, access, backups and incidents",
  },
];

const dataIssues = [
  "Completed status with progress below 100%",
  "Done = No while status is Completed",
  "Missing owner",
  "Missing progress on active work",
  "Missing due date on high-priority work",
  "Duplicate task titles",
  "Conflicting statuses for the same task",
  "Active task without a recent update",
  "Recurring executions stored as unrelated duplicate tasks",
  "Missing completion timestamp",
];

const viewNames = [
  "Today’s routines",
  "Daily meeting agenda",
  "High-priority open work",
  "Waiting for approval",
  "Blocked work",
  "Overdue and aging work",
  "Work by primary owner",
  "Work by portfolio",
  "Routine compliance",
  "Backup and infrastructure exceptions",
  "Onboarding/offboarding status",
  "Asset and access exceptions",
  "Weekly completed versus created work",
  "Monthly KPI summary",
  "Data-quality exceptions",
];

function nextFor(cadence: RoutineSeed["cadence"]) {
  return dayOffset(today(), cadence === "Daily" ? 1 : cadence === "Weekly" ? 7 : 30);
}

export function ensureITWorkspace(state: HubState, users: Actor[]): boolean {
  if (state.records.some((record) => record.id === "IT-PORTFOLIO-01")) return false;
  const stamp = new Date().toISOString();
  const owner = users.some((user) => user.id === PRIMARY_OWNER)
    ? PRIMARY_OWNER
    : (users.find((user) => user.workspaceId === IT_WORKSPACE)?.id ?? "core-essmat");
  const backup = users.some((user) => user.id === BACKUP_OWNER) ? BACKUP_OWNER : owner;
  const add = (
    id: string,
    kind: Kind,
    title: string,
    description: string,
    details: Record<string, string>,
    status: string,
    priority: WorkRecord["priority"] = "Medium",
    dueOffset = 30,
  ) => {
    state.records.push({
      id,
      workspaceId: IT_WORKSPACE,
      kind,
      title,
      description,
      ownerId: owner,
      collaborators: backup === owner ? [] : [backup],
      entityId: users.find((user) => user.id === owner)?.entityId ?? "eg",
      status,
      priority,
      startDate: today(),
      dueDate: dayOffset(today(), dueOffset),
      progress: 0,
      nextAction:
        kind === "sop"
          ? "Review and approve the controlled document"
          : "Record the next execution or operational update",
      details,
      createdBy: owner,
      createdAt: stamp,
      updatedAt: stamp,
      completedAt: "",
      sourceId: "IT workspace operating model",
      archived: false,
    });
  };

  portfolios.forEach((title, index) =>
    add(
      `IT-PORTFOLIO-${String(index + 1).padStart(2, "0")}`,
      "project",
      title,
      "IT operating portfolio. Child work is classified here without merging existing records.",
      {
        milestones: "Establish ownership\nBaseline current state\nTrack controls and exceptions",
        risk: "Unowned or unverified technology risk",
        decisionNeeded: "Confirm portfolio owner and control thresholds",
      },
      "In Progress",
      "High",
      90,
    ),
  );
  [...daily, ...weekly, ...monthly].forEach((routine, index) =>
    add(
      `IT-ROUTINE-${String(index + 1).padStart(2, "0")}`,
      "routine",
      routine.title,
      `${routine.basis} recurring control. Keep this definition persistent and store each execution separately.`,
      {
        portfolio: routine.portfolio,
        cadence: routine.cadence,
        schedule: routine.schedule ?? routine.cadence,
        basis: routine.basis,
        evidence: routine.evidence,
        successCriteria:
          "Execution completed on schedule with evidence attached and every exception owned.",
        backupOwner: backup,
        lastExecution: "",
        nextExecution: nextFor(routine.cadence),
      },
      "In Progress",
      routine.title.includes("backup") ||
        routine.title.includes("infrastructure") ||
        routine.title.includes("Router") ||
        routine.title.includes("incident")
        ? "Critical"
        : "High",
      routine.cadence === "Daily" ? 1 : routine.cadence === "Weekly" ? 7 : 30,
    ),
  );
  processes.forEach(([title, portfolio], index) =>
    add(
      `IT-PROCESS-${String(index + 1).padStart(2, "0")}`,
      "process",
      title,
      "Persistent operational process. Add child actions or execution logs; do not recreate the definition each day.",
      {
        portfolio: portfolios[portfolio]!,
        operatingModel:
          "One primary accountable owner; supporting owners collaborate through linked actions.",
        evidence: "Dated execution notes, linked tasks, incidents, approvals and attachments.",
        escalationOwner: backup,
      },
      "In Progress",
      "High",
      90,
    ),
  );
  sopSeeds.forEach((sop, index) =>
    add(
      `IT-SOP-${String(index + 1).padStart(2, "0")}`,
      "sop",
      sop.title,
      "Controlled IT operating instruction.",
      {
        purpose: sop.purpose,
        scope:
          "TryGC branches, corporate systems and IT-managed services relevant to this procedure.",
        trigger: sop.trigger,
        backupOwner: backup,
        tools: sop.tools,
        preconditions:
          "Approved access is available and the related request, routine or change record exists.",
        procedure: sop.procedure,
        evidence: sop.evidence,
        successCriteria: sop.success,
        escalation: sop.escalation,
        relatedSystems: sop.systems,
        version: "1.0",
        reviewDate: dayOffset(today(), 90),
        documentOwner: owner,
      },
      "Draft",
      "High",
      90,
    ),
  );
  dataIssues.forEach((title, index) =>
    add(
      `IT-DQ-${String(index + 1).padStart(2, "0")}`,
      "data-issue",
      title,
      "Data-quality control to detect and resolve unreliable IT work records without automatically merging conflicts.",
      {
        category:
          title.includes("Duplicate") || title.includes("duplicate")
            ? "Duplicate data"
            : title.includes("Conflicting")
              ? "Inconsistent data"
              : "Missing data",
        source: "IT workspace records",
        impact: "Management reporting, accountability or routine compliance may be unreliable.",
        fix: "Flag matching records, assign an owner and resolve after evidence review.",
      },
      "Open",
      "High",
      14,
    ),
  );

  const automationSeeds = [
    ["Generate recurring routine executions automatically", "daily", "task", "task", true, "08:00"],
    ["Notify owner before scheduled execution", "due", "routine", "notify", true, "08:00"],
    ["Escalate missed critical daily checks", "due", "routine", "escalate", true, "17:00"],
    ["Mark work overdue after its due date", "due", "task", "notify", true, "08:00"],
    [
      "Notify management when high-priority work becomes blocked",
      "blocked",
      "task",
      "escalate",
      true,
      "08:00",
    ],
    ["Remind owners when active work has no recent update", "sla", "task", "notify", true, "15:00"],
    ["Require closure evidence before completion", "due", "task", "notify", false, "16:00"],
    [
      "Create next recurring execution without duplicating its definition",
      "daily",
      "routine",
      "task",
      false,
      "18:00",
    ],
    ["Generate daily IT meeting agenda", "daily", "meeting", "task", true, "09:45"],
    ["Generate weekly IT report every Thursday", "daily", "task", "task", false, "16:00"],
    ["Generate monthly KPI report at month end", "daily", "task", "task", false, "17:00"],
  ] as const;
  automationSeeds.forEach(([title, trigger, kind, action, enabled, hour], index) =>
    state.rules.push({
      id: `IT-RULE-${String(index + 1).padStart(2, "0")}`,
      workspaceId: IT_WORKSPACE,
      title,
      trigger,
      days: trigger === "due" ? 0 : 7,
      hour,
      kind,
      action,
      channel: "in-app",
      ownerId: owner,
      enabled,
      lastRun: "",
    }),
  );
  viewNames.forEach((name, index) =>
    state.views.push({
      id: `IT-VIEW-${String(index + 1).padStart(2, "0")}`,
      userId: owner,
      workspaceId: IT_WORKSPACE,
      module:
        name.includes("routine") || name.includes("Routine")
          ? "routine"
          : name.includes("Data-quality")
            ? "data-issue"
            : "reports",
      name,
      query: "",
      status: "",
      owner: "",
      view: "table",
    }),
  );
  return true;
}
