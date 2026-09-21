import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createComplianceRouter } from '../server/complianceRoutes';
import type { ComplianceDeps } from '../server/complianceRoutes';
import type { Campaign } from '../src/types/campaign';
import type { RegulatoryEntry } from '../src/types/regulatory';

const mockCampaign: Campaign = {
  id: 'camp-1',
  name: 'Test Glow Serum',
  productType: 'skincare',
  productDescription: 'Skin hydration serum.',
  targetAudience: 'Adults 20-40',
  platforms: ['TikTok'],
  approvedClaims: ['Hydrates skin'],
  prohibitedClaims: ['cures acne'],
  requiredDisclosures: ['#ad'],
  instructions: 'Tag #ad prominently',
  ownerId: 'camp-owner-1',
  assignedCreators: ['creator-1']
};

const mockRegulatory: RegulatoryEntry[] = [
  {
    id: 'reg-1',
    source: 'ASA / CAP Code',
    sectionRef: 'Section 12.1',
    summary: 'Medicinal claims require clinical substantiation.',
    documentName: 'CAP Code',
    effectiveDate: '2023-01-01',
    topicTags: ['health claims', 'substantiation']
  }
];

function buildApp(overrides?: Partial<ComplianceDeps>) {
  const deps: ComplianceDeps = {
    verifyToken: vi.fn().mockResolvedValue({ uid: 'creator-1', email: 'creator@test.com' }),
    getUserRole: vi.fn().mockResolvedValue('creator'),
    getCampaign: vi.fn().mockResolvedValue(mockCampaign),
    getRegulatoryEntries: vi.fn().mockResolvedValue(mockRegulatory),
    saveReport: vi.fn().mockResolvedValue('report-saved-123'),
    ai: {
      reason: vi.fn().mockResolvedValue(
        JSON.stringify({
          overall_status: 'GREEN',
          human_review_required: false,
          issues: []
        })
      ),
      chat: vi.fn().mockResolvedValue('Here is a safe rewrite.')
    },
    ...overrides
  };

  const app = express();
  app.use(express.json());
  app.use(createComplianceRouter(deps));
  return { app, deps };
}

describe('Compliance Routes Authentication & Gatekeeper', () => {
  it('returns 401 when no Authorization header or demo mode is supplied', async () => {
    const { app } = buildApp();
    const res = await fetchResponse(app, '/api/compliance/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: 'camp-1', submittedContentText: 'Hello world #ad' })
    });

    expect(res.status).toBe(401);
  });

  it('rejects access if user role is not permitted for the endpoint', async () => {
    const { app } = buildApp({
      getUserRole: vi.fn().mockResolvedValue('campaigner')
    });

    const res = await fetchResponse(app, '/api/compliance/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ campaignId: 'camp-1', submittedContentText: 'Hello world #ad' })
    });

    expect(res.status).toBe(403);
  });

  it('allows creator to evaluate content and saves server report', async () => {
    const { app, deps } = buildApp();

    const res = await fetchResponse(app, '/api/compliance/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ campaignId: 'camp-1', submittedContentText: 'Loving this hydration serum! #ad' })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reportId).toBe('report-saved-123');
    expect(deps.saveReport).toHaveBeenCalled();
  });

  it('fails closed to AMBER or RED when AI reasoning throws or fails', async () => {
    const { app } = buildApp({
      ai: {
        reason: vi.fn().mockResolvedValue(null),
        chat: vi.fn().mockResolvedValue(null)
      }
    });

    const res = await fetchResponse(app, '/api/compliance/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token'
      },
      body: JSON.stringify({ campaignId: 'camp-1', submittedContentText: 'Loving this hydration serum! #ad' })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.report.aiReasoning.overall_status).not.toBe('GREEN');
    expect(body.report.aiReasoning.human_review_required).toBe(true);
  });
});

// Helper for testing express apps without listening on a socket
async function fetchResponse(app: express.Express, path: string, init: RequestInit): Promise<Response> {
  const { createServer } = await import('http');
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.listen(0, async () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      try {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
        server.close();
        resolve(response);
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}
