import { useState, type FormEvent } from "react";
import { BookmarkPlus, CalendarClock, Play, Trash2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { type ScheduledBrief, useAgentSettings } from "./agent-settings";

const control =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AgentPromptLibrary({
  onPick,
  compact = false,
}: {
  onPick: (prompt: string) => void;
  compact?: boolean;
}) {
  const settings = useAgentSettings();
  const shown = compact ? settings.savedPrompts.slice(0, 6) : settings.savedPrompts;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((prompt) => (
        <Button key={prompt.id} variant="outline" size="sm" onClick={() => onPick(prompt.prompt)}>
          {prompt.title}
        </Button>
      ))}
      {!compact && <NewPromptDialog />}
    </div>
  );
}

export function AgentPromptManager({ onRun }: { onRun: (prompt: string) => void }) {
  const settings = useAgentSettings();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Prompt library</p>
          <p className="text-xs text-muted-foreground">
            Reusable briefs, and the schedules that run them.
          </p>
        </div>
        <NewPromptDialog />
      </div>
      <div className="divide-y overflow-hidden rounded-lg border">
        {settings.savedPrompts.map((prompt) => {
          const schedule = settings.schedules.find((item) => item.promptId === prompt.id);
          return (
            <div key={prompt.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{prompt.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{prompt.prompt}</p>
                {schedule?.enabled ? (
                  <p className="mt-1 text-xs text-primary">
                    Runs {schedule.cadence} at {String(schedule.hour).padStart(2, "0")}:00
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRun(prompt.prompt)}
                  aria-label={`Run ${prompt.title}`}
                >
                  <Play className="size-3.5" aria-hidden="true" />
                </Button>
                <ScheduleDialog promptId={prompt.id} title={prompt.title} {...(schedule ? { existing: schedule } : {})} />
                {!prompt.builtIn && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => settings.removePrompt(prompt.id)}
                    aria-label={`Delete ${prompt.title}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewPromptDialog() {
  const settings = useAgentSettings();
  const [open, setOpen] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const prompt = String(form.get("prompt") ?? "").trim();
    if (!title || !prompt) return;
    settings.addPrompt(title, prompt);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BookmarkPlus className="size-3.5" aria-hidden="true" /> Save a prompt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save a prompt</DialogTitle>
          <DialogDescription>
            Keep a brief you run often, then schedule it if it is recurring.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Title
            <Input name="title" placeholder="Friday collections review" required />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Prompt
            <Textarea name="prompt" rows={5} placeholder="What should the agent do?" required />
          </label>
          <Button type="submit">Save prompt</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({
  promptId,
  title,
  existing,
}: {
  promptId: string;
  title: string;
  existing?: ScheduledBrief;
}) {
  const settings = useAgentSettings();
  const [open, setOpen] = useState(false);
  const [cadence, setCadence] = useState<ScheduledBrief["cadence"]>(existing?.cadence ?? "daily");
  const [hour, setHour] = useState(String(existing?.hour ?? 8));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={existing?.enabled ? "default" : "ghost"}
          size="sm"
          aria-label={`Schedule ${title}`}
        >
          <CalendarClock className="size-3.5" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule “{title}”</DialogTitle>
          <DialogDescription>
            Briefs run while the agent page is open, at most once per hour window.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            Cadence
            <select
              className={control}
              value={cadence}
              onChange={(event) => setCadence(event.target.value as ScheduledBrief["cadence"])}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Hour
            <Input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(event) => setHour(event.target.value)}
            />
          </label>
          <Button
            onClick={() => {
              settings.toggleSchedule(promptId, cadence, Number(hour) || 8);
              setOpen(false);
            }}
          >
            {existing?.enabled ? "Pause schedule" : "Enable schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
