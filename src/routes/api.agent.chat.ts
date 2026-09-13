import { createFileRoute } from "@tanstack/react-router";
import { generateText, type ModelMessage } from "ai";
import { formatModelError, resolveAgentModel, type ModelRequest } from "../lib/agent-model";

interface ChatBody extends ModelRequest {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  workspaceContext?: string;
  /** Set when resuming a reply that stopped at the token ceiling. */
  continuation?: boolean;
}

/**
 * The system prompt asks for metric tiles, a chart, a deep-dive, a table and an
 * action plan. That does not fit in a small budget, and the old 2000-token ceiling
 * truncated answers mid-sentence — which reads as the agent disconnecting. The
 * client resumes from `finishReason === "length"`, so this is a per-turn budget
 * rather than a limit on the total answer.
 */
const MAX_OUTPUT_TOKENS = 8000;

export const Route = createFileRoute("/api/agent/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as ChatBody;
        const resolved = resolveAgentModel(body);
        if ("error" in resolved)
          return Response.json({ error: resolved.error, ready: resolved.ready }, { status: 400 });

        // A continuation carries the partial answer plus a resume instruction, so it
        // needs more room than a normal turn before older context is dropped.
        const messages = (body.messages ?? [])
          .filter((message) => message.content.trim())
          .slice(body.continuation ? -24 : -20) as ModelMessage[];
        if (!messages.length)
          return Response.json({ error: "Send a message first." }, { status: 400 });

        try {
          const systemPrompt =
            "You are the TryGC Executive Operating Agent — a senior operating analyst and intelligence partner.\n" +
            "You MUST deliver highly organized, visually structured, and data-grounded responses with charts, KPI visual metrics, analytical diagnostics, and concrete action plans.\n\n" +
            "RESPONSE STRUCTURE GUIDELINES:\n" +
            "Whenever analyzing priorities, health, owners, bottlenecks, or general status, organize your response into these distinct sections:\n\n" +
            "1. 📊 KPI METRIC TILES\n" +
            "Always lead executive summaries with interactive metric tiles formatted exactly as a json:metrics block:\n" +
            "```json:metrics\n" +
            "{\n" +
            '  "tiles": [\n' +
            '    { "label": "Open Deliverables", "value": "12", "hint": "Across 4 owners" },\n' +
            '    { "label": "Overdue & Critical", "value": "3", "hint": "Immediate action required" },\n' +
            '    { "label": "Due This Week", "value": "5", "hint": "Priority focus" },\n' +
            '    { "label": "Health Score", "value": "78%", "hint": "+6% vs last week" }\n' +
            "  ]\n" +
            "}\n" +
            "```\n\n" +
            "2. 📈 VISUAL DISTRIBUTION CHART\n" +
            'Provide an interactive visual chart (using either "bar" or "donut" variant) that highlights workload, status breakdown, or priority distribution:\n' +
            "```json:chart\n" +
            "{\n" +
            '  "variant": "bar",\n' +
            '  "title": "Workload Distribution by Owner",\n' +
            '  "unit": "records",\n' +
            '  "data": [\n' +
            '    { "label": "Sarah", "value": 5 },\n' +
            '    { "label": "Ahmed", "value": 4 },\n' +
            '    { "label": "Elena", "value": 3 }\n' +
            "  ]\n" +
            "}\n" +
            "```\n" +
            'For priority, category, or stage mix, you can use "variant": "donut".\n\n' +
            "3. 🔍 DEEP-DIVE ANALYSIS & BOTTLENECKS\n" +
            "Provide structured analysis using Markdown headings, bold callouts, and bullet points:\n" +
            "- **Bottlenecks & Critical Path**: Highlight stalled, overdue, or blocked items.\n" +
            "- **Resource Allocation**: Analyze owner balance, identifying who is overloaded.\n" +
            "- **Delivery Risk**: Highlight approaching deadlines and SLA vulnerabilities.\n\n" +
            "4. 📋 ACTIONABLE WORK TABLE\n" +
            "Include a clean Markdown table summarizing the most relevant records:\n" +
            "| Record | Owner | Status | Priority | Due Date |\n" +
            "| --- | --- | --- | --- | --- |\n\n" +
            "5. ⚡ RECOMMENDED ACTION PLAN\n" +
            "Numbered, concrete, prioritized actions with specific owners and clear deadlines.\n\n" +
            "STRICT OPERATING INVARIANTS:\n" +
            "- Base all counts, owners, and dates strictly on the provided workspace context.\n" +
            "- Keep numbers consistent across metric tiles, charts, tables, and narrative.\n" +
            "- Never claim to have altered records; this chat interface provides read-only executive intelligence.\n\n" +
            "WORKSPACE CONTEXT:\n" +
            (body.workspaceContext ?? "No workspace context supplied.");

          const continuationRule = body.continuation
            ? "\n\nCONTINUATION MODE:\nYou are resuming a reply that was cut off at the token limit. " +
              "Continue from exactly where the previous message stopped — mid-sentence if that is where it ended. " +
              "Do not repeat any content already written, do not restate earlier sections, and do not open with a preamble."
            : "";

          const result = await generateText({
            model: resolved.model,
            system: systemPrompt + continuationRule,
            messages,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
          });
          return Response.json({
            text: result.text,
            // "length" means the ceiling was hit and the answer is incomplete; the
            // client uses this to resume rather than leaving a half-written reply.
            finishReason: result.finishReason,
            provider: resolved.providerId,
            model: resolved.modelId,
          });
        } catch (error) {
          return Response.json({ error: formatModelError(error) }, { status: 502 });
        }
      },
    },
  },
});
