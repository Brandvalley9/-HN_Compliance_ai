import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  containsClaim,
  containsDisclosure,
  evaluateDeterministicRules,
  reconcileWithDeterministic,
  matchRegulatoryEntries
} from '../src/shared/complianceCore';
import type { Campaign } from '../src/types/campaign';
import type { RegulatoryEntry } from '../src/types/regulatory';

describe('Text Normalisation & Claim / Disclosure Matching', () => {
  it('strips accents, zero-width chars, and normalises quotes', () => {
    const raw = 'Guarant\u00e9\u200bed \u2018returns\u2019!';
    expect(normalizeText(raw)).toBe('guaranteed returns');
  });

  it('separates conjoined hashtags into distinct tokens', () => {
    const raw = 'Loving this! #ad#sponsored#beauty';
    expect(normalizeText(raw)).toBe('loving this #ad #sponsored #beauty');
  });

  it('matches claims tolerating plurals, tense, and suffixes', () => {
    expect(containsClaim('They are guaranteeing returns to everyone', 'guaranteed returns')).toBe(true);
    expect(containsClaim('It cured my acne completely', 'cure acne')).toBe(true);
  });

  it('does NOT match partial substrings for disclosures (#ad must not match #adventure)', () => {
    expect(containsDisclosure('Join us on an incredible #adventure today!', '#ad')).toBe(false);
    expect(containsDisclosure('Join us on an incredible #ad today!', '#ad')).toBe(true);
    expect(containsDisclosure('Check this out #AD now', '#ad')).toBe(true);
  });
});

describe('Deterministic Rule Engine & Gatekeeper', () => {
  const baseCampaign: Campaign = {
    id: 'camp-test',
    name: 'Skin Restore Serum',
    productDescription: 'Moisturising barrier serum',
    productType: 'skincare',
    targetAudience: 'Adults 25-45',
    platforms: ['TikTok', 'Instagram'],
    approvedClaims: ['Hydrates skin deeply'],
    prohibitedClaims: ['miracle cure', 'cures eczema'],
    requiredDisclosures: ['#ad', '#sponsored'],
    instructions: 'Post during peak hours',
    ownerId: 'owner-1',
    assignedCreators: []
  };

  it('fails with campaign_incomplete when required campaign fields are missing', () => {
    const incompleteCampaign: Campaign = {
      ...baseCampaign,
      targetAudience: '',
      platforms: []
    };
    const findings = evaluateDeterministicRules(incompleteCampaign, 'Great product! #ad #sponsored');
    expect(findings.some((f) => f.ruleCategory === 'campaign_incomplete')).toBe(true);
  });

  it('flags missing disclosures as FAIL and present disclosures as PASS', () => {
    const content = 'Check out this routine #ad';
    const findings = evaluateDeterministicRules(baseCampaign, content);

    const adFinding = findings.find((f) => f.ruleId.includes('disclosure-pass--ad'));
    const sponsoredFinding = findings.find((f) => f.ruleId.includes('disclosure-fail--sponsored'));

    expect(adFinding?.status).toBe('PASS');
    expect(sponsoredFinding?.status).toBe('FAIL');
  });

  it('detects prohibited claims and built-in absolute high-risk terms', () => {
    const content = 'This is a miracle cure with 100% risk free results! #ad #sponsored';
    const findings = evaluateDeterministicRules(baseCampaign, content);

    expect(findings.some((f) => f.ruleId.includes('prohibited-fail-miracle-cure'))).toBe(true);
    expect(findings.some((f) => f.ruleId.includes('high-risk-phrase-100%-risk-free'))).toBe(true);
  });

  it('reconciles AI verdict: failed prohibited claims force RED and human review', () => {
    const findings = evaluateDeterministicRules(baseCampaign, 'This cures eczema completely! #ad #sponsored');
    const aiVerdict = {
      overall_status: 'GREEN' as const,
      human_review_required: false,
      issues: []
    };

    const reconciled = reconcileWithDeterministic(aiVerdict, findings);
    expect(reconciled.overall_status).toBe('RED');
    expect(reconciled.human_review_required).toBe(true);
  });
});

describe('Regulatory Retrieval Scoring', () => {
  const sampleEntries: RegulatoryEntry[] = [
    {
      source: 'ASA / CAP Code',
      sectionRef: 'Section 12.1',
      documentName: 'CAP Code',
      summary: 'Health and medicinal claims must be substantiated.',
      topicTags: ['health claims', 'substantiation', 'misleading claims']
    },
    {
      source: 'FCA Guidance',
      sectionRef: 'FG24/1',
      documentName: 'Financial Promotions',
      summary: 'Rules on crypto assets and risk warnings.',
      topicTags: ['crypto & high-risk investments', 'guaranteed returns']
    }
  ];

  it('prioritises health regulations for skincare product types', () => {
    const matched = matchRegulatoryEntries(sampleEntries, {
      productType: 'skincare',
      topicContext: 'cures acne and hydrates skin'
    });

    expect(matched.length).toBeGreaterThan(0);
    expect(matched[0].source).toBe('ASA / CAP Code');
  });
});
