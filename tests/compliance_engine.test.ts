import { describe, it, expect } from 'vitest';
import {
  evaluateDeterministicRules,
  validateComplianceReasoningResponse
} from '../src/lib/complianceService';

const mockCampaign = {
  id: 'c1',
  name: 'SuperBoost Launch',
  ownerId: 'campaigner-1',
  targetAudience: 'Adults 18-35',
  platforms: ['Instagram', 'TikTok'],
  productType: 'Dietary Supplement',
  requiredDisclosures: ['#ad', 'Sponsored by SuperBoost'],
  prohibitedClaims: ['cures chronic fatigue', 'replaces medical treatment'],
  status: 'active' as const
};

const mockAllowedRegulatoryEntries = [
  {
    id: 'reg1',
    source: 'FTC',
    sectionRef: '16 CFR § 255.5',
    documentName: 'Guides Concerning the Use of Endorsements',
    summary: 'Clear and conspicuous disclosure required',
    jurisdiction: 'US'
  },
  {
    id: 'reg2',
    source: 'FDA',
    sectionRef: '21 CFR § 101.93',
    documentName: 'Dietary Supplement Health and Education Act',
    summary: 'Structure/function claims require disclaimer',
    jurisdiction: 'US'
  }
];

describe('Compliance Engine - Deterministic Evaluation', () => {
  it('1. incomplete campaign → failure (gate check)', () => {
    const incompleteCampaign = { ...mockCampaign, targetAudience: '' };
    const findings = evaluateDeterministicRules(incompleteCampaign, 'Check out this product!');
    expect(findings.some(f => f.ruleId === 'gate-campaign-incomplete')).toBe(true);
    expect(findings[0].status).toBe('FAIL');
  });

  it('2. missing disclosure → failure', () => {
    const text = 'I love this supplement! Sponsored by SuperBoost';
    const findings = evaluateDeterministicRules(mockCampaign, text);
    const missingAd = findings.find(f => f.ruleCategory === 'required_disclosure' && f.status === 'FAIL');
    expect(missingAd).toBeDefined();
    expect(missingAd?.ruleName).toContain('#ad');
  });

  it('3. disclosure present → pass', () => {
    const text = 'Check out this new routine! #ad Sponsored by SuperBoost';
    const findings = evaluateDeterministicRules(mockCampaign, text);
    const disclosureFails = findings.filter(f => f.ruleCategory === 'required_disclosure' && f.status === 'FAIL');
    const disclosurePasses = findings.filter(f => f.ruleCategory === 'required_disclosure' && f.status === 'PASS');
    expect(disclosureFails.length).toBe(0);
    expect(disclosurePasses.length).toBe(2);
  });

  it('4. prohibited claim → failure', () => {
    const text = 'Take this daily, it cures chronic fatigue in days! #ad Sponsored by SuperBoost';
    const findings = evaluateDeterministicRules(mockCampaign, text);
    const violation = findings.find(f => f.ruleCategory === 'prohibited_claim' && f.status === 'FAIL');
    expect(violation).toBeDefined();
    expect(violation?.matchedText).toBe('cures chronic fatigue');
  });

  it('5. high-risk phrase → failure', () => {
    const text = 'This product is a miracle cure and 100% risk free! #ad Sponsored by SuperBoost';
    const findings = evaluateDeterministicRules(mockCampaign, text);
    const miracle = findings.find(f => f.ruleId.includes('miracle-cure'));
    const riskFree = findings.find(f => f.ruleId.includes('100%-risk-free'));
    expect(miracle).toBeDefined();
    expect(riskFree).toBeDefined();
    expect(miracle?.status).toBe('FAIL');
  });

  it('6. clean content → no deterministic failures', () => {
    const text = 'Loving my daily morning routine with this beverage. #ad Sponsored by SuperBoost';
    const findings = evaluateDeterministicRules(mockCampaign, text);
    const failures = findings.filter(f => f.status === 'FAIL');
    expect(failures.length).toBe(0);
  });
});

describe('Compliance Engine - Reasoning Schema & Grounding Validator', () => {
  it('7. invalid AI status → normalized to AMBER', () => {
    const raw = {
      overall_status: 'SUPER_RISKY',
      human_review_required: false,
      issues: []
    };
    const validated = validateComplianceReasoningResponse(raw, mockAllowedRegulatoryEntries);
    expect(validated.overall_status).toBe('AMBER');
  });

  it('8. invalid severity → normalized to MEDIUM', () => {
    const raw = {
      overall_status: 'RED',
      human_review_required: true,
      issues: [{ severity: 'CATASTROPHIC', finding: 'Bad claim', category: 'Health' }]
    };
    const validated = validateComplianceReasoningResponse(raw, mockAllowedRegulatoryEntries);
    expect(validated.issues[0].severity).toBe('MEDIUM');
  });

  it('9. regulatory citations: hallucinated stripped, valid retained', () => {
    const raw = {
      overall_status: 'AMBER',
      human_review_required: true,
      issues: [
        {
          finding: 'Missing prominent placement',
          regulatory_references: [
            'FTC 16 CFR § 255.5',
            'SEC Rule 10b-5 Fraud Violation',
            'UK CAP Code Rule 2.1'
          ]
        }
      ]
    };
    const validated = validateComplianceReasoningResponse(raw, mockAllowedRegulatoryEntries);
    expect(validated.issues[0].regulatory_references).toEqual(['FTC 16 CFR § 255.5']);
  });

  it('10. invalid confidence → clamped/normalized to range [0, 1] or default', () => {
    const raw = {
      overall_status: 'GREEN',
      human_review_required: false,
      issues: [
        { finding: 'Test 1', confidence: 15.0 },
        { finding: 'Test 2', confidence: -2.5 },
        { finding: 'Test 3', confidence: 'not-a-number' }
      ]
    };
    const validated = validateComplianceReasoningResponse(raw, mockAllowedRegulatoryEntries);
    expect(validated.issues[0].confidence).toBe(1);
    expect(validated.issues[1].confidence).toBe(0);
    expect(validated.issues[2].confidence).toBe(0.85);
  });
});