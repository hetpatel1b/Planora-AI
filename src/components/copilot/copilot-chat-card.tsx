"use client";

import * as React from "react";
import { askCopilotAction } from "@/lib/actions/copilot";
import type {
  CopilotClientMessage,
  CopilotSuggestions,
} from "@/lib/validations/copilot";
import {
  SuggestedTaskCard,
  SuggestedBudgetItemCard,
  RecommendationsList,
} from "@/components/copilot/copilot-suggestion-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  RotateCcw,
  ListTodo,
  IndianRupee,
  MessageSquare,
  ChevronDown,
  X,
} from "lucide-react";

export interface CopilotChatCardProps {
  eventId: string;
  eventDate?: string | null;
  eventName?: string;
  className?: string;
  inDrawer?: boolean;
  onClose?: () => void;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: CopilotSuggestions | null;
}

const STARTER_PROMPTS = [
  "How can I reduce my event budget?",
  "What should I complete this week?",
  "How can I improve my current schedule?",
];

import {
  type ParsedBlock,
  parseMarkdownBlocks,
  renderFormattedInline,
} from "@/lib/markdown-utils";

export {
  type ParsedBlock,
  parseMarkdownBlocks,
  renderFormattedInline,
};

function renderBlocks(blocks: ParsedBlock[]): React.ReactNode {
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

/**
 * Safely renders markdown-like text lines as pure React elements without dangerouslySetInnerHTML.
 * Supports headings, bullet lists, ordered lists, markdown tables, bold segments, and inline code.
 * Accepts optional pre-parsed `blocks` to eliminate duplicate parsing in parent message components.
 */
export function SafeMarkdownText({ content, blocks: propBlocks }: SafeMarkdownTextProps) {
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

/**
 * Assistant message bubble with restrained "Show full response" / "Show less"
 * toggle for extensive replies, keeping proposal cards separate and interactive.
 */
export function AssistantMessageBubble({
  msg,
  inDrawer,
  eventId,
  eventDate,
}: {
  msg: DisplayMessage;
  inDrawer?: boolean;
  eventId: string;
  eventDate?: string | null;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const blocks = React.useMemo(() => parseMarkdownBlocks(msg.content), [msg.content]);

  // A response is considered extensive if length > 650 chars or contains more than 6 visual blocks
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
          {msg.suggestions.suggestedTasks && msg.suggestions.suggestedTasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <ListTodo className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Proposed Checklist Tasks</span>
              </div>
              <div className={`grid grid-cols-1 gap-2 ${inDrawer ? "" : "sm:grid-cols-2"}`}>
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
          {msg.suggestions.suggestedBudgetItems && msg.suggestions.suggestedBudgetItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <IndianRupee className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Proposed Budget Allocations</span>
              </div>
              <div className={`grid grid-cols-1 gap-2 ${inDrawer ? "" : "sm:grid-cols-2"}`}>
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
          {msg.suggestions.recommendations && msg.suggestions.recommendations.length > 0 && (
            <RecommendationsList recommendations={msg.suggestions.recommendations} />
          )}
        </div>
      )}
    </div>
  );
}

export function CopilotChatCard({
  eventId,
  eventDate,
  eventName,
  className = "",
  inDrawer = false,
  onClose,
}: CopilotChatCardProps) {
  const [messages, setMessages] = React.useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastSubmittedText, setLastSubmittedText] = React.useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = React.useState<string>("");

  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messageCounterRef = React.useRef(0);

  // Auto-scroll chat to bottom on new messages
  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isPending]);

  const handleSubmit = async (textToSend?: string) => {
    const rawText = textToSend ?? inputValue;
    const trimmed = rawText.trim();
    if (!trimmed || isPending) return;

    if (trimmed.length > 2000) {
      setErrorMessage("Message cannot exceed 2,000 characters.");
      return;
    }

    setErrorMessage(null);
    setLastSubmittedText(trimmed);

    messageCounterRef.current += 1;
    const userMessage: DisplayMessage = {
      id: `user-msg-${messageCounterRef.current}`,
      role: "user",
      content: trimmed,
    };

    const newDisplayMessages = [...messages, userMessage];
    setMessages(newDisplayMessages);
    setInputValue("");
    setIsPending(true);
    setStatusAnnouncement("Copilot is analyzing your question and event context...");

    // Build bounded message array for Server Action (max 15 turns)
    const clientMessages: CopilotClientMessage[] = newDisplayMessages
      .slice(-15)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const result = await askCopilotAction({
        eventId,
        messages: clientMessages,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setStatusAnnouncement(`Copilot request failed: ${result.error}`);
        setIsPending(false);
        return;
      }

      messageCounterRef.current += 1;
      const assistantMessage: DisplayMessage = {
        id: `assistant-msg-${messageCounterRef.current}`,
        role: "assistant",
        content: result.data.reply,
        suggestions: result.data.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStatusAnnouncement("Copilot reply received.");
    } catch {
      setErrorMessage("An unexpected error occurred while communicating with the Copilot.");
      setStatusAnnouncement("An unexpected error occurred.");
    } finally {
      setIsPending(false);
      // Restore focus to input
      textareaRef.current?.focus();
    }
  };

  const handleRetry = () => {
    if (lastSubmittedText) {
      handleSubmit(lastSubmittedText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={
        inDrawer
          ? `flex flex-col h-full max-h-[100dvh] bg-white dark:bg-slate-900 overflow-hidden ${className}`
          : `rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`
      }
    >
      {/* Live Region for Screen Reader Feedback */}
      <div role="status" aria-live="polite" className="sr-only">
        {statusAnnouncement}
      </div>

      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3.5 sm:p-5 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xs">
            <Sparkles className="size-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white truncate">
                Conversational AI Copilot
              </h3>
              <Badge variant="outline" className="hidden xs:inline-flex text-[10px] text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-900">
                Phase 5 Copilot
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Interactive strategic advisor grounded in {eventName ? `"${eventName}"` : "your event"} data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setMessages([])}
              className="text-slate-500 text-xs h-8 px-2"
            >
              Clear
            </Button>
          )}
          {inDrawer && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Copilot"
              className="flex size-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Log */}
      <div
        ref={chatContainerRef}
        tabIndex={0}
        aria-label="Copilot Conversation Log"
        className={
          inDrawer
            ? "flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 space-y-4 focus-visible:outline-hidden overscroll-contain"
            : "max-h-[500px] min-h-[220px] overflow-y-auto p-4 sm:p-5 space-y-4 focus-visible:outline-hidden"
        }
      >
        {messages.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
              <MessageSquare className="size-5" />
            </div>
            <h4 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              How can I assist your planning today?
            </h4>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
              Ask questions about budget allocation, timeline milestones, vendor checklists, or scheduling priorities.
            </p>

            {/* Quick Starter Chips */}
            <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-2 max-w-md mx-auto">
              {STARTER_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSubmit(promptText)}
                  className="w-full sm:w-auto text-left sm:text-center rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300 cursor-pointer break-words [overflow-wrap:anywhere]"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {msg.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5 text-indigo-600 dark:text-indigo-400" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 shadow-2xs break-words [overflow-wrap:anywhere] min-w-0 ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/50"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <AssistantMessageBubble
                    msg={msg}
                    inDrawer={inDrawer}
                    eventId={eventId}
                    eventDate={eventDate}
                  />
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Bubble */}
        {isPending && (
          <div className="flex items-start gap-3">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Bot className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              <Loader2 className="size-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              <span>Analyzing event context and synthesizing recommendations...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Alert with Retry */}
      {errorMessage && (
        <div className="mx-5 mb-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          {lastSubmittedText && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleRetry}
              disabled={isPending}
              className="gap-1 border-rose-300 bg-white text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300"
            >
              <RotateCcw className="size-3" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="shrink-0 border-t border-slate-100 p-3 sm:p-4 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            placeholder="Ask Copilot about budget, schedule, or checklists... (Enter to send, Shift+Enter for newline)"
            aria-label="Ask the Copilot a planning question"
            className="flex-1 resize-none bg-transparent px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden dark:text-slate-100 dark:placeholder:text-slate-500 min-h-[38px] max-h-[120px]"
          />

          <Button
            type="submit"
            size="sm"
            disabled={isPending || !inputValue.trim()}
            className="shrink-0 gap-1.5 h-9 px-3 min-w-[44px] rounded-lg"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <>
                <Send className="size-3.5" />
                <span className="sr-only sm:not-sr-only sm:text-xs">Send</span>
              </>
            )}
          </Button>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400 dark:text-slate-500 gap-2">
          <span className="truncate">AI advice is advisory. Add suggestions via confirmation buttons above.</span>
          <span className="shrink-0">{`${inputValue.length}/2,000`}</span>
        </div>
      </form>
    </div>
  );
}
