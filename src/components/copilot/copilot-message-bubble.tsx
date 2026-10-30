"use client";

import * as React from "react";
import type { CopilotSuggestions } from "@/lib/validations/copilot";
import {
  type ParsedBlock,
  parseMarkdownBlocks,
  renderFormattedInline,
} from "@/lib/markdown-utils";
import {
  SuggestedTaskCard,
  SuggestedBudgetItemCard,
  RecommendationsList,
} from "@/components/copilot/copilot-suggestion-card";
import { ListTodo, IndianRupee, ChevronDown } from "lucide-react";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: CopilotSuggestions | null;
}

export function renderBlocks(blocks: ParsedBlock[]): React.ReactNode {
  return blocks.map((block, idx) => {
    switch (block.type) {
      case "heading": {
        if (block.level === 1 || block.level === 2) {
          return (
            <h3
              key={idx}
              className="text-xs font-bold tracking-tight text-slate-950 dark:text-white mt-2.5 mb-1 first:mt-0"
            >
              {renderFormattedInline(block.text || "")}
            </h3>
          );
        }
        return (
          <h4
            key={idx}
            className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2 mb-0.5 first:mt-0"
          >
            {renderFormattedInline(block.text || "")}
          </h4>
        );
      }
      case "bullet-list": {
        return (
          <ul key={idx} className="my-1.5 list-disc space-y-1 pl-4 text-xs">
            {block.items?.map((item, itemIdx) => (
              <li key={itemIdx} className="leading-relaxed">
                {renderFormattedInline(item)}
              </li>
            ))}
          </ul>
        );
      }
      case "ordered-list": {
        return (
          <ol key={idx} className="my-1.5 list-decimal space-y-1 pl-4 text-xs">
            {block.items?.map((item, itemIdx) => (
              <li key={itemIdx} className="leading-relaxed">
                {renderFormattedInline(item)}
              </li>
            ))}
          </ol>
        );
      }
      case "table": {
        return (
          <div
            key={idx}
            className="my-2 max-w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <table className="w-full min-w-[260px] text-left text-xs border-collapse">
              {block.headers && (
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-2.5 py-1.5 font-bold text-slate-900 dark:text-slate-100"
                      >
                        {renderFormattedInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {block.rows?.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300"
                      >
                        {renderFormattedInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "paragraph":
      default: {
        return (
          <p key={idx} className="leading-relaxed">
            {renderFormattedInline(block.text || "")}
          </p>
        );
      }
    }
  });
}

export interface SafeMarkdownTextProps {
  content?: string;
  blocks?: ParsedBlock[];
}

export function SafeMarkdownText({
  content,
  blocks: propBlocks,
}: SafeMarkdownTextProps) {
  const blocks = React.useMemo(() => {
    if (propBlocks) {
      return propBlocks;
    }
    return content ? parseMarkdownBlocks(content) : [];
  }, [propBlocks, content]);

  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
      {renderBlocks(blocks)}
    </div>
  );
}

export interface AssistantMessageBubbleProps {
  msg: DisplayMessage;
  inDrawer?: boolean;
  eventId: string;
  eventDate?: string | null;
}

export function AssistantMessageBubble({
  msg,
  inDrawer,
  eventId,
  eventDate,
}: AssistantMessageBubbleProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const blocks = React.useMemo(
    () => parseMarkdownBlocks(msg.content),
    [msg.content]
  );

  const isExtensive = msg.content.length > 650 || blocks.length > 6;

  return (
    <div className="space-y-3">
      {/* Markdown Text Container */}
      <div className="relative">
        <div
          id={`msg-content-${msg.id}`}
          className={
            isExtensive && !isExpanded
              ? "max-h-56 overflow-hidden relative transition-all duration-300"
              : "transition-all duration-300"
          }
        >
          <SafeMarkdownText blocks={blocks} content={msg.content} />

          {/* Fade Overlay when Collapsed */}
          {isExtensive && !isExpanded && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 dark:from-slate-800/90 to-transparent"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Accessible Show More / Show Less Toggle Button */}
        {isExtensive && (
          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-controls={`msg-content-${msg.id}`}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-2xs hover:bg-slate-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300 cursor-pointer"
            >
              <span>{isExpanded ? "Show less" : "Show full response"}</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>

      {/* Actionable Suggestions Blocks (Always visible, NEVER truncated) */}
      {msg.suggestions && (
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-4">
          {/* Suggested Tasks */}
          {msg.suggestions.suggestedTasks &&
            msg.suggestions.suggestedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <ListTodo className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Proposed Checklist Tasks</span>
                </div>
                <div
                  className={`grid grid-cols-1 gap-2 ${
                    inDrawer ? "" : "sm:grid-cols-2"
                  }`}
                >
                  {msg.suggestions.suggestedTasks.map((task, idx) => (
                    <SuggestedTaskCard
                      key={`msg-${msg.id}-task-${idx}`}
                      eventId={eventId}
                      eventDate={eventDate}
                      task={task}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* Suggested Budget Items */}
          {msg.suggestions.suggestedBudgetItems &&
            msg.suggestions.suggestedBudgetItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <IndianRupee className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Proposed Budget Allocations</span>
                </div>
                <div
                  className={`grid grid-cols-1 gap-2 ${
                    inDrawer ? "" : "sm:grid-cols-2"
                  }`}
                >
                  {msg.suggestions.suggestedBudgetItems.map((item, idx) => (
                    <SuggestedBudgetItemCard
                      key={`msg-${msg.id}-budget-${idx}`}
                      eventId={eventId}
                      item={item}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* Advisory Recommendations */}
          {msg.suggestions.recommendations &&
            msg.suggestions.recommendations.length > 0 && (
              <RecommendationsList
                recommendations={msg.suggestions.recommendations}
              />
            )}
        </div>
      )}
    </div>
  );
}

