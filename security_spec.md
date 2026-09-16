# Security Specification: Role-Based Access Control (RBAC)

## 1. Data Invariants & Access Matrix
- **Users Collection (`/users/{uid}`)**:
  - Contains user document with role: `'campaigner' | 'creator' | 'reviewer'`.
  - Authenticated users can read their own profile. Reviewers can read user profiles.
  - Users can create/update their profile for their own `uid`.
- **Campaigns Collection (`/campaigns/{campaignId}`)**:
  - Create/Update/Delete: ONLY the owning campaigner (`getUserRole(request.auth.uid) == 'campaigner' && request.auth.uid == ownerId`).
  - Read: Reviewers (`getUserRole(request.auth.uid) == 'reviewer'`), Campaign owners (`resource.data.ownerId == request.auth.uid`), or assigned Creators (`getUserRole(request.auth.uid) == 'creator' && ('assignedCreators' in resource.data && request.auth.uid in resource.data.assignedCreators)`).
  - Writers: Creators and reviewers are strictly DENIED write access.
- **Regulatory Entries (`/regulatory_entries/{entryId}`)**:
  - Read: All authenticated users (`request.auth != null`).
  - Create/Update/Delete: ONLY users with role `'reviewer'` (`getUserRole(request.auth.uid) == 'reviewer'`).
- **Compliance Reports (`/compliance_reports/{reportId}`)**:
  - Create: Creators can create a report ONLY for themselves (`creatorId == request.auth.uid`).
  - Read: Creators can read their own reports (`resource.data.creatorId == request.auth.uid`). Reviewers can read all reports. Campaigners can read reports for their owned campaigns.
  - Update: Reviewers can update ONLY the `reviewerDecision` field (and updatedAt timestamp). AI reasoning, findings, and creator submission content remain immutable. All other users cannot update.
  - Delete: Denied to preserve compliance records.
- **Audit Trail (`/campaigns/{campaignId}/audit_trail/{versionId}`)**:
  - Read: Reviewers and the owning campaigner.
  - Create: Creator matching the report creatorId or owning campaigner / server logic.
  - Update/Delete: Fully denied (immutable audit log).

## 2. The Dirty Dozen Payloads (Expected to Fail / Be Blocked)
1. Creator attempting to create a Campaign (`create /campaigns/c1` by Creator) -> DENIED.
2. Reviewer attempting to update Campaign instructions (`update /campaigns/c1` by Reviewer) -> DENIED.
3. Campaigner attempting to delete another Campaigner's Campaign -> DENIED.
4. Creator attempting to read an unassigned Campaign where `assignedCreators` does not include them -> DENIED.
5. Non-reviewer (Campaigner or Creator) attempting to create or edit a Regulatory Entry -> DENIED.
6. Creator attempting to submit a Compliance Report for a different `creatorId` (`creatorId != request.auth.uid`) -> DENIED.
7. Campaigner attempting to read Compliance Reports for another campaigner's campaign -> DENIED.
8. Reviewer attempting to overwrite `aiReasoning`, `deterministicFindings`, or `submittedContentText` when recording a decision -> DENIED.
9. Creator attempting to modify or erase a Compliance Report after submission -> DENIED.
10. Any user attempting to update an existing Audit Trail version document (`update /campaigns/c1/audit_trail/v1`) -> DENIED.
11. Any user attempting to delete an Audit Trail entry -> DENIED.
12. Unauthenticated user attempting to read any campaigns, reports, regulatory entries, or audit trails -> DENIED.
