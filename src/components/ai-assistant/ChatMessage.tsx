import React from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { ChatMessage as ChatMessageType } from "@/contexts/AIAssistantContext";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { EstimateFormInline } from "./forms/EstimateFormInline";
import { InvoiceFormInline } from "./forms/InvoiceFormInline";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const navigate = useNavigate();
  const { submitForm, isLoading } = useAIAssistant();
  const isUser = message.role === "user";

  const handleActionClick = (action: { type: string; path?: string }) => {
    if (action.type === "navigate" && action.path) {
      navigate(action.path);
    }
  };

  const handleFormSubmit = (data: {
    type: "create_estimate" | "create_invoice";
    customer_id: string;
    customer_name: string;
    line_items: Array<{ description: string; quantity: number; unit_price: number }>;
    notes?: string;
  }) => {
    submitForm(data);
  };

  // Safe markdown-like rendering — no dangerouslySetInnerHTML
  const renderContent = (content: string): React.ReactNode[] => {
    // Split on **bold**, *italic*, and newlines, render as React elements
    const parts: React.ReactNode[] = [];
    // Combined pattern: **bold**, *italic*, newline
    const pattern = /(\*\*.*?\*\*|\*.*?\*|\n)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;

    while ((match = pattern.exec(content)) !== null) {
      // Push plain text before this match
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const token = match[0];
      if (token === "\n") {
        parts.push(<br key={`br-${keyIdx++}`} />);
      } else if (token.startsWith("**")) {
        parts.push(<strong key={`b-${keyIdx++}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*")) {
        parts.push(<em key={`em-${keyIdx++}`}>{token.slice(1, -1)}</em>);
      }

      lastIndex = match.index + token.length;
    }

    // Push any remaining plain text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5",
          message.formRequest 
            ? "max-w-full w-full" 
            : "max-w-[80%]",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <div
        className="text-sm leading-relaxed"
        >
          {renderContent(message.content)}
        </div>

        {/* Inline Form for Estimate */}
        {message.formRequest && message.formRequest.type === "create_estimate" && (
          <EstimateFormInline
            prefilled={message.formRequest.prefilled}
            onSubmit={handleFormSubmit}
            isSubmitting={isLoading}
          />
        )}

        {/* Inline Form for Invoice */}
        {message.formRequest && message.formRequest.type === "create_invoice" && (
          <InvoiceFormInline
            prefilled={message.formRequest.prefilled}
            onSubmit={handleFormSubmit}
            isSubmitting={isLoading}
          />
        )}

        {/* Action Buttons */}
        {message.actions && message.actions.length > 0 && !message.formRequest && (
          <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border/20">
            {message.actions.map((action, index) => (
              <Button
                key={index}
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleActionClick(action)}
              >
                {action.type === "navigate" ? "View" : action.type}
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          className={cn(
            "text-[10px] mt-1 opacity-60",
            isUser ? "text-right" : "text-left"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
