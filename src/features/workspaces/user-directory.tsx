import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useApp } from "../../lib/store";
import { useHub } from "./provider";
import { access } from "./service";
import { closed } from "./model";
import type { User } from "../../lib/types";
import type { WorkspaceId } from "../../lib/workspace-hub";
import { WORKSPACES } from "../../lib/workspace-hub";
import {
  canManageUser,
  validateRemoval,
  validateUser,
  type UserInput,
} from "../../lib/user-management";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { control } from "./record-form";
export function UserDirectory({ workspaceId }: { workspaceId?: WorkspaceId }) {
  const { db, currentUser, actions, entityName } = useApp();
  const { state, transact } = useHub();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id?: string; value: UserInput } | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);
  const [replacement, setReplacement] = useState("");
  const [error, setError] = useState("");
  const people = db.users.filter(
    (u) =>
      (!workspaceId || u.workspaceId === workspaceId) &&
      `${u.name} ${u.email} ${u.role} ${u.jobTitle ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const create = () => {
    setError("");
    setEditing({
      value: {
        name: "",
        email: "",
        role: workspaceId === "it" ? "IT Admin" : "HR Specialist",
        department: workspaceId === "it" ? "IT" : "HR",
        entityId: currentUser.entityId,
        scope: "group",
        status: "active",
        workspaceId: workspaceId ?? "hr",
        workspaceLevel: "member",
        managerId: "",
      },
    });
  };
  const patch = (key: keyof UserInput, value: string) => {
    if (editing) setEditing({ ...editing, value: { ...editing.value, [key]: value } });
  };
  function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      validateUser(db.users, currentUser, editing.value, editing.id);
      if (editing.id) actions.updateUser(editing.id, editing.value);
      else actions.addUser(editing.value);
      setEditing(null);
      toast.success("User saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save user.");
    }
  }
  function remove() {
    if (!removing) return;
    try {
      validateRemoval(db.users, currentUser, removing.id);
      const live = state.records.filter(
        (r) => !closed(r) && (r.ownerId === removing.id || r.details["approverId"] === removing.id),
      );
      const rules = state.rules.filter((r) => r.ownerId === removing.id && r.enabled);
      const successor = db.users.find(
        (u) => u.id === replacement && u.id !== removing.id && u.status === "active",
      );
      if (
        (live.length || rules.length) &&
        (!successor ||
          live.some((r) => !access(successor, r.workspaceId)) ||
          rules.some((r) => !access(successor, r.workspaceId)))
      )
        throw new Error("Choose an active replacement with access to the assigned work.");
      if (
        successor &&
        live.some(
          (r) =>
            (r.ownerId === removing.id && r.details["approverId"] === successor.id) ||
            (r.details["approverId"] === removing.id && r.ownerId === successor.id),
        )
      )
        throw new Error(
          "Replacement would own and approve the same task. Reassign those approvals first.",
        );
      transact((s) => {
        for (const r of s.records) {
          if (r.ownerId === removing.id) {
            if (!closed(r) && successor) r.ownerId = successor.id;
            else r.details["formerOwnerName"] = removing.name;
          }
          if (r.details["approverId"] === removing.id && !closed(r) && successor)
            r.details["approverId"] = successor.id;
          r.collaborators = r.collaborators.filter((id) => id !== removing.id);
        }
        for (const r of s.rules)
          if (r.ownerId === removing.id) {
            if (successor) r.ownerId = successor.id;
            else r.enabled = false;
          }
        s.audit.unshift({
          id: crypto.randomUUID(),
          workspaceId: removing.workspaceId,
          recordId: removing.id,
          actorId: currentUser.id,
          action: "User removed; open work reassigned",
          at: new Date().toISOString(),
          before: JSON.stringify({ id: removing.id, name: removing.name }),
          after: JSON.stringify({ replacement: successor?.id ?? null }),
        });
      });
      actions.removeUser(removing.id);
      setRemoving(null);
      toast.success("User removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove user.");
    }
  }
  const roleOptions = db.roles
    .map((r) => r.name)
    .filter((role) =>
      canManageUser(currentUser, {
        workspaceId: editing?.value.workspaceId ?? workspaceId ?? "hr",
        role,
      }),
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="sm:max-w-sm"
          aria-label="Search users"
          placeholder="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canManageUser(currentUser) && <Button onClick={create}>Add user</Button>}
      </div>
      {people.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="font-semibold">No users added yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your team members to assign tasks and manage their workspace.
          </p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {people.map((u) => (
          <article key={u.id} className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">{u.name}</h2>
            <p className="text-sm text-muted-foreground">
              {u.jobTitle || u.role} · {u.workspaceLevel} · {u.status}
            </p>
            <p className="mt-2 text-sm">{u.email || "Email not provided"}</p>
            <p className="text-sm">{entityName(u.entityId)}</p>
            {u.managerId && (
              <p className="text-sm">
                Reports to {db.users.find((x) => x.id === u.managerId)?.name || "Unassigned"}
              </p>
            )}
            {canManageUser(currentUser, u) && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError("");
                    setEditing({ id: u.id, value: { ...u } });
                  }}
                >
                  Edit user
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={u.id === currentUser.id}
                  onClick={() => {
                    setError("");
                    setReplacement("");
                    setRemoving(u);
                  }}
                >
                  Remove user
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {editing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit user" : "Add user"}</DialogTitle>
              <DialogDescription>
                Enter the person's actual details and workspace role.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="grid gap-3">
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
              <label>
                Name
                <Input
                  required
                  value={editing.value.name}
                  onChange={(e) => patch("name", e.target.value)}
                />
              </label>
              <label>
                Email
                <Input
                  type="email"
                  required={!editing.value.source}
                  value={editing.value.email}
                  onChange={(e) => patch("email", e.target.value)}
                />
              </label>
              <label>
                Job title
                <Input
                  value={editing.value.jobTitle ?? ""}
                  onChange={(e) => patch("jobTitle", e.target.value)}
                />
              </label>
              {!workspaceId && (
                <label>
                  Workspace
                  <select
                    className={control}
                    value={editing.value.workspaceId}
                    onChange={(e) => patch("workspaceId", e.target.value)}
                  >
                    {WORKSPACES.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Role
                <select
                  className={control}
                  value={editing.value.role}
                  onChange={(e) => patch("role", e.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>
              <label>
                Team level
                <select
                  className={control}
                  value={editing.value.workspaceLevel}
                  onChange={(e) => patch("workspaceLevel", e.target.value)}
                >
                  {["member", "supervisor", "lead"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Department
                <Input
                  required
                  value={editing.value.department}
                  onChange={(e) => patch("department", e.target.value)}
                />
              </label>
              <label>
                Entity
                <select
                  className={control}
                  value={editing.value.entityId}
                  onChange={(e) => patch("entityId", e.target.value)}
                >
                  {db.entities.map((e) => (
                    <option value={e.id} key={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Reports to
                <select
                  className={control}
                  value={editing.value.managerId ?? ""}
                  onChange={(e) => patch("managerId", e.target.value)}
                >
                  <option value="">No manager assigned</option>
                  {db.users
                    .filter(
                      (u) =>
                        u.id !== editing.id &&
                        u.status === "active" &&
                        u.workspaceId === editing.value.workspaceId,
                    )
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Status
                <select
                  className={control}
                  value={editing.value.status}
                  onChange={(e) => patch("status", e.target.value)}
                >
                  {["active", "suspended", "offboarding"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="submit">Save user</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {removing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setRemoving(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove {removing.name}?</DialogTitle>
              <DialogDescription>
                Completed work and audit history are retained. Choose a replacement if this user
                owns open work or approvals.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
            <label>
              Replacement owner
              <select
                className={control}
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
              >
                <option value="">No replacement</option>
                {db.users
                  .filter(
                    (u) =>
                      u.id !== removing.id &&
                      u.status === "active" &&
                      access(u, removing.workspaceId),
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={remove}>
                Remove user permanently
              </Button>
              <Button variant="outline" onClick={() => setRemoving(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
