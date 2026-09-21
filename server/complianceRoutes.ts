import { Router, Request, Response, NextFunction } from 'express';
import type { Campaign } from '../src/types/campaign';
import type { ComplianceReasoningResult, ComplianceReport } from '../src/types/compliance';
import type { RegulatoryEntry } from '../src/types/regulatory';
import type { UserRole } from '../src/types/auth';
import {
  campaignTopicContext,
  evaluateDeterministicRules,
  isCampaignIncomplete,
  matchRegulatoryEntries,
  reconcileWithDeterministic,
  synthesizeFallbackReasoning,
  validateComplianceReasoningResponse
} from '../src/shared/complianceCore';
import type { AiService, ChatInput } from './gemini';
import { createRateLimiter, RateLimiter } from './rateLimit';

const ROLES: UserRole[] = ['campaigner', 'creator', 'reviewer'];
const MAX_CONTENT_CHARS = 5000;
const MAX_CHAT_MESSAGE_CHARS = 2000;

/** Everything the routes need from the outside world. Injected so tests never touch Firebase or Gemini. */
export interface ComplianceDeps {
  /** Verifies a Firebase ID token; throws if invalid/expired/revoked. */
  verifyToken(idToken: string): Promise<{ uid: string; email?: string }>;
  /** Server-trusted role from /users/{uid}; null if the user has no profile. */
  getUserRole(uid: string): Promise<UserRole | null>;
  getCampaign(id: string): Promise<Campaign | null>;
  getRegulatoryEntries(): Promise<RegulatoryEntry[]>;
  /** Persists a report using privileged (Admin) access and returns its id. */
  saveReport(report: Omit<ComplianceReport, 'id'>): Promise<string>;
  ai: AiService;
  /** Dev-only: accept `x-demo-role` instead of a token. Must be false in production. */
  demoApiEnabled?: boolean;
  aiLimiter?: RateLimiter;
  chatLimiter?: RateLimiter;
  now?: () => Date;
}

interface AuthInfo {
  uid: string;
  role: UserRole;
  email?: string;
  demo: boolean;
}
type AuthedRequest = Request & { auth?: AuthInfo };

const isRole = (v: unknown): v is UserRole => typeof v === 'string' && (ROLES as string[]).includes(v);
const isStringArray = (v: unknown, max = 50): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((x) => typeof x === 'string' && x.length <= 2000);

/** Whitelists and bounds a campaign object supplied inline (demo mode only). */
function sanitizeInlineCampaign(raw: any, ownerId: string): Campaign | null {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v: unknown, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : '');
  const arr = (v: unknown) => (isStringArray(v) ? v : []);
  return {
    id: str(raw.id, 200) || 'demo-campaign',
    name: str(raw.name, 300),
    productDescription: str(raw.productDescription),
    productType: str(raw.productType, 300),
    targetAudience: str(raw.targetAudience, 500),
    platforms: arr(raw.platforms),
    approvedClaims: arr(raw.approvedClaims),
    prohibitedClaims: arr(raw.prohibitedClaims),
    requiredDisclosures: arr(raw.requiredDisclosures),
    instructions: str(raw.instructions),
    ownerId,
    assignedCreators: []
  };
}

function sanitizeInlineEntries(raw: unknown): RegulatoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 100).map((e: any) => ({
    source: String(e?.source ?? '').slice(0, 200),
    documentName: String(e?.documentName ?? '').slice(0, 500),
    sectionRef: String(e?.sectionRef ?? '').slice(0, 300),
    summary: String(e?.summary ?? '').slice(0, 3000),
    effectiveDate: String(e?.effectiveDate ?? '').slice(0, 50),
    topicTags: isStringArray(e?.topicTags, 30) ? e.topicTags : [],
    sourceUrl: String(e?.sourceUrl ?? '').slice(0, 1000)
  }));
}

export function createComplianceRouter(deps: ComplianceDeps): Router {
  const router = Router();
  const now = deps.now ?? (() => new Date());
  const aiLimiter = deps.aiLimiter ?? createRateLimiter({ windowMs: 60_000, max: 10 });
  const chatLimiter = deps.chatLimiter ?? createRateLimiter({ windowMs: 60_000, max: 30 });

  /* ------------------------------ authentication ----------------------------- */
  const authenticate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.header('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(header);

    if (match) {
      try {
        const decoded = await deps.verifyToken(match[1]);
        const role = await deps.getUserRole(decoded.uid);
        if (!role) {
          return res.status(403).json({ success: false, error: 'No user profile found for this account.' });
        }
        req.auth = { uid: decoded.uid, role, email: decoded.email, demo: false };
        return next();
      } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired sign-in. Please sign in again.' });
      }
    }

    const demoRole = req.header('x-demo-role');
    if (deps.demoApiEnabled && isRole(demoRole)) {
      req.auth = { uid: `demo-${demoRole}`, role: demoRole, demo: true };
      return next();
    }

    return res.status(401).json({ success: false, error: 'Authentication required.' });
  };

  const requireRole = (...allowed: UserRole[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !allowed.includes(req.auth.role)) {
      return res.status(403).json({ success: false, error: 'Your role is not permitted to perform this action.' });
    }
    next();
  };

  const limit = (limiter: RateLimiter) => (req: AuthedRequest, res: Response, next: NextFunction) => {
    const verdict = limiter.check(req.auth!.uid);
    if (verdict.ok === false) {
      res.setHeader('Retry-After', String(verdict.retryAfterSec));
      return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment and try again.' });
    }
    next();
  };

  /* ------------------------ shared evaluation pipeline ----------------------- */
  async function evaluate(
    req: AuthedRequest
  ): Promise<
    | { ok: true; report: Omit<ComplianceReport, 'id'> }
    | { ok: false; status: number; error: string; code?: string }
  > {
    const auth = req.auth!;
    const body = req.body || {};
    const text = body.submittedContentText;

    if (typeof text !== 'string' || text.trim().length === 0) {
      return { ok: false, status: 400, error: "Missing or invalid 'submittedContentText'." };
    }
    if (text.length > MAX_CONTENT_CHARS) {
      return { ok: false, status: 413, error: `Content is too long (max ${MAX_CONTENT_CHARS} characters).` };
    }

    // Resolve the campaign from the server's own data (never trust a client-sent brief).
    let campaign: Campaign | null;
    let entries: RegulatoryEntry[];
    if (auth.demo) {
      campaign = sanitizeInlineCampaign(body.campaign, auth.uid);
      entries = sanitizeInlineEntries(body.regulatoryEntries);
      if (!campaign) return { ok: false, status: 400, error: "Missing 'campaign'." };
    } else {
      if (typeof body.campaignId !== 'string' || !body.campaignId) {
        return { ok: false, status: 400, error: "Missing 'campaignId'." };
      }
      campaign = await deps.getCampaign(body.campaignId);
      if (!campaign) return { ok: false, status: 404, error: 'Campaign not found.' };

      // Same visibility rules as firestore.rules
      const allowed =
        auth.role === 'reviewer' ||
        (auth.role === 'campaigner' && campaign.ownerId === auth.uid) ||
        (auth.role === 'creator' && Array.isArray(campaign.assignedCreators) && campaign.assignedCreators.includes(auth.uid));
      if (!allowed) return { ok: false, status: 403, error: 'You do not have access to this campaign.' };

      entries = await deps.getRegulatoryEntries();
    }

    const deterministicFindings = evaluateDeterministicRules(campaign, text);
    const incomplete = isCampaignIncomplete(deterministicFindings);
    if (incomplete) {
      return { ok: false, status: 422, error: incomplete.message, code: 'CAMPAIGN_INCOMPLETE' };
    }

    const matched = matchRegulatoryEntries(entries, {
      productType: campaign.productType,
      topicContext: campaignTopicContext(campaign)
    });

    let reasoning: ComplianceReasoningResult;
    const failClosed = (why: string) => synthesizeFallbackReasoning(deterministicFindings, matched, text, why);
    try {
      const raw = await deps.ai.reason({
        campaign,
        submittedContentText: text,
        deterministicFindings,
        matchedRegulatoryEntries: matched
      });
      if (!raw) {
        reasoning = failClosed('AI reasoning was temporarily unavailable.');
      } else {
        try {
          reasoning = reconcileWithDeterministic(
            validateComplianceReasoningResponse(JSON.parse(raw), matched),
            deterministicFindings
          );
        } catch {
          reasoning = failClosed('The AI returned an unreadable response.');
        }
      }
    } catch (err) {
      console.error('AI reasoning error:', err);
      reasoning = failClosed('AI reasoning failed.');
    }

    const report: Omit<ComplianceReport, 'id'> = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      creatorId: auth.uid,
      submittedContentText: text,
      deterministicFindings,
      matchedRegulatoryEntries: matched,
      aiReasoning: reasoning,
      createdAt: now().toISOString(),
      ...(reasoning.warning ? { warning: reasoning.warning } : {})
    };
    // Strip `undefined` (Firestore rejects it) and detach from shared references.
    return { ok: true, report: JSON.parse(JSON.stringify(report)) };
  }

  const handle = (mode: 'submit' | 'preview') => async (req: AuthedRequest, res: Response) => {
    try {
      const result = await evaluate(req);
      if (result.ok === false) {
        return res.status(result.status).json({ success: false, error: result.error, code: result.code });
      }
      if (mode === 'preview') {
        return res.json({ success: true, report: result.report });
      }
      if (req.auth!.demo) {
        // Demo reports are never persisted server-side.
        return res.json({ success: true, reportId: null, report: result.report });
      }
      const reportId = await deps.saveReport(result.report);
      return res.json({ success: true, reportId, report: { ...result.report, id: reportId } });
    } catch (err) {
      console.error(`Compliance ${mode} error:`, err);
      return res.status(500).json({ success: false, error: 'Internal compliance error. Please try again.' });
    }
  };

  router.post('/api/compliance/submit', authenticate, requireRole('creator'), limit(aiLimiter), handle('submit'));
  router.post('/api/compliance/preview', authenticate, requireRole('campaigner', 'reviewer'), limit(aiLimiter), handle('preview'));

  /* ---------------------------------- chat ---------------------------------- */
  router.post('/api/compliance/chat', authenticate, limit(chatLimiter), async (req: AuthedRequest, res: Response) => {
    try {
      const b = req.body || {};
      const c = b.campaign;
      if (
        !c || typeof c !== 'object' ||
        typeof b.submittedContentText !== 'string' || !b.submittedContentText ||
        typeof b.userMessage !== 'string' || !b.userMessage.trim()
      ) {
        return res.status(400).json({ success: false, error: 'Missing required fields: campaign, submittedContentText, or userMessage.' });
      }
      if (b.userMessage.length > MAX_CHAT_MESSAGE_CHARS || b.submittedContentText.length > MAX_CONTENT_CHARS) {
        return res.status(413).json({ success: false, error: 'Message or draft is too long.' });
      }
      const history = Array.isArray(b.conversationHistory) ? b.conversationHistory.slice(-20) : [];
      const input: ChatInput = {
        campaign: {
          name: String(c.name ?? '').slice(0, 300),
          productType: String(c.productType ?? '').slice(0, 300),
          approvedClaims: isStringArray(c.approvedClaims) ? c.approvedClaims : [],
          prohibitedClaims: isStringArray(c.prohibitedClaims) ? c.prohibitedClaims : [],
          requiredDisclosures: isStringArray(c.requiredDisclosures) ? c.requiredDisclosures : []
        },
        submittedContentText: b.submittedContentText,
        complianceResult: b.complianceResult && typeof b.complianceResult === 'object'
          ? { overall_status: b.complianceResult.overall_status, issues: Array.isArray(b.complianceResult.issues) ? b.complianceResult.issues.slice(0, 20) : [] }
          : undefined,
        matchedRegulatoryEntries: (Array.isArray(b.matchedRegulatoryEntries) ? b.matchedRegulatoryEntries : [])
          .slice(0, 30)
          .map((e: any) => ({
            source: String(e?.source ?? '').slice(0, 200),
            sectionRef: String(e?.sectionRef ?? '').slice(0, 300),
            summary: String(e?.summary ?? '').slice(0, 2000)
          })),
        conversationHistory: history
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) })),
        userMessage: b.userMessage
      };

      let reply = await deps.ai.chat(input);
      if (!reply) reply = chatFallback(input);
      return res.json({ success: true, reply });
    } catch (err) {
      console.error('Compliance chat error:', err);
      return res.status(500).json({ success: false, error: 'Internal chat error.' });
    }
  });

  return router;
}

/** Deterministic canned reply used only when the model is unreachable. */
export function chatFallback(input: ChatInput): string {
  const lower = input.userMessage.toLowerCase();
  const campaign = input.campaign;
  if (lower.includes('alternative') || lower.includes('rephrase') || lower.includes('rewrite')) {
    const approved = campaign.approvedClaims?.[0] || 'fits easily into my everyday routine';
    const disclosures = (campaign.requiredDisclosures?.length ? campaign.requiredDisclosures : ['#ad']).join(' ');
    return `Here is a compliant alternative phrasing you can use:\n\n"I've been loving the ${campaign.name}! What stands out most is how it ${approved.toLowerCase()}. Check out the link in my bio to try it out! ${disclosures}"\n\nThis version keeps your natural voice while ensuring all mandatory disclosures are visible and replacing unverified claims with approved benefits.`;
  }
  if (lower.includes('why') || lower.includes('flag')) {
    const first = input.complianceResult?.issues?.[0];
    if (first) {
      return `This was flagged under ${first.category}: "${first.finding}". Advertising rules prohibit claims like "${first.evidence}" unless they are properly substantiated. You can resolve this by using approved claims from your brief instead.`;
    }
    return `Your draft was evaluated against mandatory disclosures (${campaign.requiredDisclosures?.join(', ')}) and prohibited claims. Anything promising absolute cures or missing required tags gets flagged to protect you and the brand.`;
  }
  return "I'm here to help you get your draft to a GREEN status! You can ask me why any specific word was flagged, or ask for compliant alternative phrasings that match your tone.";
}

/** JSON error handler for malformed bodies etc. so /api never returns HTML. */
export function apiErrorHandler(err: any, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);
  const status = err?.status === 413 || err?.type === 'entity.too.large' ? 413 : err?.status && err.status < 500 ? err.status : 500;
  return res.status(status).json({ success: false, error: status === 413 ? 'Request body too large.' : status < 500 ? 'Bad request.' : 'Internal server error.' });
}
