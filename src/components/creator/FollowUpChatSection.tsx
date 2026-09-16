import React, { useState } from 'react';
import { Campaign } from '../../types/campaign';
import { MatchedRegulatoryEntry } from '../../types/regulatory';
import { 
  ComplianceReasoningResult, 
  FollowUpChatMessage 
} from '../../types/compliance';
import { sendComplianceFollowUpChat } from '../../lib/complianceService';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Bot, 
  User, 
  Copy, 
  Check, 
  HelpCircle,
  FileEdit,
  ArrowRight
} from 'lucide-react';

interface FollowUpChatSectionProps {
  submissionId: string;
  versionNumber: number;
  campaign: Campaign;
  submittedContentText: string;
  complianceResult: ComplianceReasoningResult;
  matchedRegulatoryEntries: MatchedRegulatoryEntry[];
  messages: FollowUpChatMessage[];
  onAddMessage: (msg: FollowUpChatMessage) => void;
  onApplyAlternativeToDraft?: (text: string) => void;
}

export const FollowUpChatSection: React.FC<FollowUpChatSectionProps> = ({
  submissionId,
  versionNumber,
  campaign,
  submittedContentText,
  complianceResult,
  matchedRegulatoryEntries,
  messages,
  onAddMessage,
  onApplyAlternativeToDraft
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputVal).trim();
    if (!messageContent || isSending) return;

    const userMessage: FollowUpChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    };

    onAddMessage(userMessage);
    if (!textToSend) setInputVal('');
    setIsSending(true);

    try {
      // Build conversation history from previous messages
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const reply = await sendComplianceFollowUpChat({
        campaign,
        submittedContentText,
        complianceResult,
        matchedRegulatoryEntries,
        conversationHistory,
        userMessage: messageContent
      });

      const assistantMessage: FollowUpChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString()
      };

      onAddMessage(assistantMessage);
    } catch (err: any) {
      console.error('Follow-up chat error:', err);
      const errorMessage: FollowUpChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't process your question right now: ${err.message || 'Please try again'}.`,
        timestamp: new Date().toISOString()
      };
      onAddMessage(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const quickPrompts = [
    { label: 'Why was my draft flagged?', prompt: 'Why is this flagged and what are the specific legal risks?' },
    { label: 'Give me compliant alternatives', prompt: 'Give me an alternative phrasing that preserves my punchy UGC style but makes it 100% compliant.' },
    { label: 'How should I place #ad?', prompt: 'Where exactly should my required disclosures (#ad) appear to meet FTC and ASA rules?' }
  ];

  return (
    <div 
      id={`submission-followup-chat-${submissionId}`}
      className="rounded-2xl border border-indigo-200/80 bg-gradient-to-b from-indigo-50/40 via-white to-white p-5 space-y-4 shadow-2xs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              Follow-Up Compliance Chat
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                Scoped to v{versionNumber}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Ask questions about flagged issues or request alternative compliant phrasings grounded in this campaign's rules.
            </p>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-medium self-start sm:self-auto">
          Grounding: ASA • CAP • FTC • Campaign Brief
        </div>
      </div>

      {/* Message Stream */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-2">
            <HelpCircle className="w-5 h-5 text-indigo-500 mx-auto" />
            <p className="text-xs text-slate-700 font-medium">
              Have questions about this audit?
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Ask the compliance co-pilot why a phrase was flagged or get alternative phrasing to fix issues before re-checking.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-xs shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-normal">{msg.content}</p>

                  {!isUser && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700 font-medium">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Answer</span>
                          </>
                        )}
                      </button>

                      {onApplyAlternativeToDraft && (
                        <button
                          type="button"
                          onClick={() => onApplyAlternativeToDraft(msg.content)}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                          title="Extract or copy this suggestion into your draft editor for Re-Check"
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>Use in Draft Editor</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && (
          <div className="flex gap-2.5 items-center text-xs text-indigo-700 bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/60 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
            <span>Analyzing draft & regulations with Gemini Flash...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Suggested:
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isSending}
            onClick={() => handleSendMessage(qp.prompt)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          id={`chat-input-v${versionNumber}`}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isSending}
          placeholder="Ask why a phrase is flagged or request alternative phrasing..."
          className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 disabled:bg-slate-50 shadow-inner"
        />

        <button
          id={`chat-send-btn-v${versionNumber}`}
          type="submit"
          disabled={isSending || !inputVal.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-2xs transition-colors shrink-0"
        >
          {isSending ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
