# ENHANCE-002: Email Notification Stubs for Claim Status Changes

**Type:** Enhancement
**Priority:** Low
**Component:** Backend — Service Layer

## Summary
Add an email notification service stub that logs notification events when claim status changes occur. This prepares the system for future integration with an actual email provider.

## Description
When a claim status changes (e.g., OPEN → UNDER_INVESTIGATION, RESERVE_SET → SETTLED), the system should generate a notification event. For now, this should be a stub service that:
- Logs the notification details (recipient, subject, claim number, new status)
- Stores notification records in a new `notification_log` table
- Does NOT actually send emails (stub only)

## Acceptance Criteria
- [ ] Create a `NotificationService` with a `notifyStatusChange(Claim claim, String oldStatus, String newStatus)` method
- [ ] Create a `NotificationLog` JPA entity with fields: id, claimId, recipientEmail, subject, body, status (PENDING/SENT/FAILED), createdAt
- [ ] Wire the notification service into `ClaimService.updateClaimStatus()` and other status-changing methods
- [ ] Add a GET endpoint: `/api/claims/{id}/notifications` to retrieve notification history
- [ ] Log notification details at INFO level
- [ ] Unit test for the notification service
- [ ] Notification records should be queryable via the API

## Notes
This is a preparatory enhancement. The actual email sending will be implemented in a future sprint with SendGrid or SES integration.

## Demo Relevance
This ticket demonstrates a realistic greenfield enhancement that requires creating new entities, services, and endpoints — a good test of autonomous implementation capability.
