import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { spawn, ChildProcess } from 'node:child_process';
import http from 'node:http';

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8085;
const PROJECT_ID = 'demo-hypenex-compliance';

let emulatorProcess: ChildProcess | null = null;
let testEnv: RulesTestEnvironment;

// Utility to ping the emulator port to verify readiness
function isEmulatorRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/`, (res) => {
      resolve(res.statusCode !== undefined);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Find the installed cloud-firestore-emulator jar
function findEmulatorJar(): string | null {
  const cachePath = path.join(process.env.HOME || '/root', '.cache/firebase/emulators');
  if (fs.existsSync(cachePath)) {
    const files = fs.readdirSync(cachePath);
    const jar = files.find((f) => f.startsWith('cloud-firestore-emulator') && f.endsWith('.jar'));
    if (jar) return path.join(cachePath, jar);
  }
  return null;
}

before(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${EMULATOR_PORT}`;

  const alreadyRunning = await isEmulatorRunning();
  if (!alreadyRunning) {
    const jarPath = findEmulatorJar();
    if (!jarPath) {
      throw new Error('Firestore emulator jar not found in ~/.cache/firebase/emulators');
    }

    emulatorProcess = spawn(
      'java',
      [
        '-jar',
        jarPath,
        '--host',
        EMULATOR_HOST,
        '--port',
        String(EMULATOR_PORT),
        '--rules',
        'firestore.rules',
      ],
      { stdio: 'ignore', detached: false }
    );

    // Poll until ready
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await isEmulatorRunning()) {
        ready = true;
        break;
      }
    }
    if (!ready) {
      throw new Error('Firestore emulator failed to start within timeout');
    }
  }

  const rules = fs.readFileSync('firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
  if (emulatorProcess) {
    emulatorProcess.kill('SIGTERM');
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Seed baseline data using admin/disabled security rules context
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // 1. Seed user documents
    await setDoc(doc(db, 'users', 'creator-1'), {
      uid: 'creator-1',
      email: 'creator1@test.com',
      role: 'creator',
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'users', 'creator-2'), {
      uid: 'creator-2',
      email: 'creator2@test.com',
      role: 'creator',
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'users', 'campaigner-1'), {
      uid: 'campaigner-1',
      email: 'campaigner1@test.com',
      role: 'campaigner',
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'users', 'campaigner-2'), {
      uid: 'campaigner-2',
      email: 'campaigner2@test.com',
      role: 'campaigner',
      createdAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'users', 'reviewer-1'), {
      uid: 'reviewer-1',
      email: 'reviewer1@test.com',
      role: 'reviewer',
      createdAt: new Date().toISOString(),
    });

    // 2. Seed campaign owned by campaigner-1 with assigned creator-1
    await setDoc(doc(db, 'campaigns', 'c1'), {
      id: 'c1',
      name: 'Spring Launch 2026',
      ownerId: 'campaigner-1',
      assignedCreators: ['creator-1'],
      guidelines: 'Follow all FTC disclosure guidelines',
      status: 'active',
    });

    // 3. Seed campaign owned by campaigner-2 with assigned creator-2
    await setDoc(doc(db, 'campaigns', 'c2'), {
      id: 'c2',
      name: 'Summer Campaign',
      ownerId: 'campaigner-2',
      assignedCreators: ['creator-2'],
      guidelines: 'No unsubstantiated health claims',
      status: 'active',
    });

    // 4. Seed audit trail entry
    await setDoc(doc(db, 'campaigns', 'c1', 'audit_trail', 'v1'), {
      campaignId: 'c1',
      creatorId: 'creator-1',
      action: 'submitted_content',
      timestamp: new Date().toISOString(),
    });

    // 5. Seed regulatory entry
    await setDoc(doc(db, 'regulatory_entries', 'reg1'), {
      id: 'reg1',
      source: 'FTC',
      documentName: 'Endorsement Guides 2025',
      summary: 'Clear and conspicuous disclosure required',
      jurisdiction: 'US',
    });

    // 6. Seed compliance reports
    await setDoc(doc(db, 'compliance_reports', 'rep1'), {
      id: 'rep1',
      campaignId: 'c1',
      creatorId: 'creator-1',
      submittedContentText: 'Great product #ad',
      aiReasoning: 'Complies with FTC disclosure placement rules',
      deterministicFindings: ['Has #ad hashtag'],
      overallStatus: 'pending_review',
    });

    await setDoc(doc(db, 'compliance_reports', 'rep2'), {
      id: 'rep2',
      campaignId: 'c2',
      creatorId: 'creator-2',
      submittedContentText: 'Another sponsor video',
      aiReasoning: 'Initial scan passed',
      deterministicFindings: [],
      overallStatus: 'pending_review',
    });
  });
});

describe('The Dirty Dozen - Security Spec RBAC Invariants', () => {
  // Payload 1
  it('1. Creator attempting to create a Campaign (create /campaigns/c1 by Creator) -> DENIED', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    await assertFails(
      setDoc(doc(creatorDb, 'campaigns', 'c_illegal'), {
        name: 'Creator Made Campaign',
        ownerId: 'creator-1',
        assignedCreators: ['creator-1'],
      })
    );
  });

  // Payload 2
  it('2. Reviewer attempting to update Campaign instructions (update /campaigns/c1 by Reviewer) -> DENIED', async () => {
    const reviewerDb = testEnv.authenticatedContext('reviewer-1', { email: 'reviewer1@test.com' }).firestore();
    await assertFails(
      updateDoc(doc(reviewerDb, 'campaigns', 'c1'), {
        guidelines: 'Reviewer changed the guidelines',
      })
    );
  });

  // Payload 3
  it('3. Campaigner attempting to delete another Campaigner\'s Campaign -> DENIED', async () => {
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();
    // c2 is owned by campaigner-2
    await assertFails(
      deleteDoc(doc(campaignerDb, 'campaigns', 'c2'))
    );
  });

  // Payload 4
  it('4. Creator attempting to read an unassigned Campaign where assignedCreators does not include them -> DENIED', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    // c2 has assignedCreators: ['creator-2'], creator-1 is not assigned
    await assertFails(
      getDoc(doc(creatorDb, 'campaigns', 'c2'))
    );
  });

  // Payload 5
  it('5. Non-reviewer (Campaigner or Creator) attempting to create or edit a Regulatory Entry -> DENIED', async () => {
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();

    // Campaigner attempting create
    await assertFails(
      setDoc(doc(campaignerDb, 'regulatory_entries', 'reg2'), {
        source: 'SEC',
        documentName: 'Campaigner Added Reg',
        summary: 'Unauthorized regulation entry',
      })
    );

    // Creator attempting update
    await assertFails(
      updateDoc(doc(creatorDb, 'regulatory_entries', 'reg1'), {
        summary: 'Creator modified FTC summary',
      })
    );
  });

  // Payload 6
  it('6. Creator attempting to submit a Compliance Report for a different creatorId (creatorId != request.auth.uid) -> DENIED', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    // creator-1 attempts to submit a report claiming creator-2
    await assertFails(
      setDoc(doc(creatorDb, 'compliance_reports', 'rep_spoofed'), {
        campaignId: 'c1',
        creatorId: 'creator-2',
        submittedContentText: 'Spoofed submission text',
      })
    );
  });

  // Payload 7
  it('7. Campaigner attempting to read Compliance Reports for another campaigner\'s campaign -> DENIED', async () => {
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();
    // rep2 belongs to campaign c2, which is owned by campaigner-2
    await assertFails(
      getDoc(doc(campaignerDb, 'compliance_reports', 'rep2'))
    );
  });

  // Payload 8
  it('8. Reviewer attempting to overwrite aiReasoning, deterministicFindings, or submittedContentText when recording a decision -> DENIED', async () => {
    const reviewerDb = testEnv.authenticatedContext('reviewer-1', { email: 'reviewer1@test.com' }).firestore();
    // Reviewer attempts to alter immutable aiReasoning along with review decision
    await assertFails(
      updateDoc(doc(reviewerDb, 'compliance_reports', 'rep1'), {
        reviewerDecision: 'approved',
        aiReasoning: 'Reviewer altered and falsified AI reasoning',
      })
    );

    // Reviewer attempts to alter submittedContentText
    await assertFails(
      updateDoc(doc(reviewerDb, 'compliance_reports', 'rep1'), {
        reviewerDecision: 'rejected',
        submittedContentText: 'Tampered submitted content',
      })
    );
  });

  // Payload 9
  it('9. Creator attempting to modify or erase a Compliance Report after submission -> DENIED', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();

    // Attempting to update report after submission
    await assertFails(
      updateDoc(doc(creatorDb, 'compliance_reports', 'rep1'), {
        submittedContentText: 'Modified post-submission content',
      })
    );

    // Attempting to delete report
    await assertFails(
      deleteDoc(doc(creatorDb, 'compliance_reports', 'rep1'))
    );
  });

  // Payload 10
  it('10. Any user attempting to update an existing Audit Trail version document (update /campaigns/c1/audit_trail/v1) -> DENIED', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();
    const reviewerDb = testEnv.authenticatedContext('reviewer-1', { email: 'reviewer1@test.com' }).firestore();

    await assertFails(
      updateDoc(doc(creatorDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
        action: 'falsified_audit_action',
      })
    );

    await assertFails(
      updateDoc(doc(campaignerDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
        action: 'falsified_audit_by_campaigner',
      })
    );

    await assertFails(
      updateDoc(doc(reviewerDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
        action: 'falsified_audit_by_reviewer',
      })
    );
  });

  // Payload 11
  it('11. Any user attempting to delete an Audit Trail entry -> DENIED', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();
    const reviewerDb = testEnv.authenticatedContext('reviewer-1', { email: 'reviewer1@test.com' }).firestore();

    await assertFails(deleteDoc(doc(creatorDb, 'campaigns', 'c1', 'audit_trail', 'v1')));
    await assertFails(deleteDoc(doc(campaignerDb, 'campaigns', 'c1', 'audit_trail', 'v1')));
    await assertFails(deleteDoc(doc(reviewerDb, 'campaigns', 'c1', 'audit_trail', 'v1')));
  });

  // Payload 12
  it('12. Unauthenticated user attempting to read any campaigns, reports, regulatory entries, or audit trails -> DENIED', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(unauthDb, 'campaigns', 'c1')));
    await assertFails(getDoc(doc(unauthDb, 'compliance_reports', 'rep1')));
    await assertFails(getDoc(doc(unauthDb, 'regulatory_entries', 'reg1')));
    await assertFails(getDoc(doc(unauthDb, 'campaigns', 'c1', 'audit_trail', 'v1')));
  });
});

describe('Valid Authorized Operations (Must Succeed)', () => {
  it('Campaigner can read and update their own Campaign', async () => {
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();
    await assertSucceeds(getDoc(doc(campaignerDb, 'campaigns', 'c1')));
    await assertSucceeds(
      updateDoc(doc(campaignerDb, 'campaigns', 'c1'), {
        name: 'Spring Launch 2026 - Updated',
      })
    );
  });

  it('Assigned Creator can read Campaign and their own Compliance Report', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    await assertSucceeds(getDoc(doc(creatorDb, 'campaigns', 'c1')));
    await assertSucceeds(getDoc(doc(creatorDb, 'compliance_reports', 'rep1')));
  });

  it('Reviewer can read any campaign, report, regulatory entries, and record reviewerDecision', async () => {
    const reviewerDb = testEnv.authenticatedContext('reviewer-1', { email: 'reviewer1@test.com' }).firestore();
    await assertSucceeds(getDoc(doc(reviewerDb, 'campaigns', 'c1')));
    await assertSucceeds(getDoc(doc(reviewerDb, 'campaigns', 'c2')));
    await assertSucceeds(getDoc(doc(reviewerDb, 'compliance_reports', 'rep1')));
    await assertSucceeds(getDoc(doc(reviewerDb, 'regulatory_entries', 'reg1')));

    // Reviewer can update reviewerDecision and updatedAt
    await assertSucceeds(
      updateDoc(doc(reviewerDb, 'compliance_reports', 'rep1'), {
        reviewerDecision: 'approved',
        updatedAt: new Date().toISOString(),
      })
    );
  });

  it('All authenticated users can read Regulatory Entries', async () => {
    const creatorDb = testEnv.authenticatedContext('creator-1', { email: 'creator1@test.com' }).firestore();
    const campaignerDb = testEnv.authenticatedContext('campaigner-1', { email: 'campaigner1@test.com' }).firestore();

    await assertSucceeds(getDoc(doc(creatorDb, 'regulatory_entries', 'reg1')));
    await assertSucceeds(getDoc(doc(campaignerDb, 'regulatory_entries', 'reg1')));
  });
});
