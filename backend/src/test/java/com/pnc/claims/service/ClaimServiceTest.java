package com.pnc.claims.service;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class ClaimServiceTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private ClaimEventRepository claimEventRepository;

    @Autowired
    private DocumentMetadataRepository documentMetadataRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Test
    void testCreateClaimFromFnol() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test collision claim");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-9999");

        Claim claim = claimService.createClaim(request);

        assertNotNull(claim.getId());
        assertNotNull(claim.getClaimNumber());
        assertEquals("OPEN", claim.getStatus());
        assertEquals("COLLISION", claim.getLossType());
        assertEquals(5, claim.getSeverityScore());
        assertEquals("Test User", claim.getClaimantName());
        assertFalse(claim.getSubrogationFlag());
    }

    @Test
    void testTriageAssignment_CollisionHighSeverity_SeniorAdjuster() {
        // Create a collision claim with severity >= 7
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 8);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "High severity collision");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0001");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        assertNotNull(assignment.getId());
        assertEquals("AUTO", assignment.getAssignmentType());

        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("SENIOR_ADJUSTER", adjuster.getRole());
    }

    @Test
    void testTriageAssignment_CollisionLowSeverity_Adjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 2L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 4);
        request.put("lossDate", "2024-10-02");
        request.put("lossDescription", "Low severity collision");
        request.put("claimantName", "Test User 2");
        request.put("claimantPhone", "555-0002");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("ADJUSTER", adjuster.getRole());
    }

    /**
     * This test exposes the intentional triage bug: THEFT claims should be
     * assigned to SENIOR_ADJUSTER, but the code compares against "Theft"
     * instead of "THEFT".
     */
    @Test
    @Tag("known-defect")
    void testTriageAssignment_Theft_ShouldAssignSeniorAdjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 3L);
        request.put("lossType", "THEFT");
        request.put("severityScore", 9);
        request.put("lossDate", "2024-10-03");
        request.put("lossDescription", "Vehicle stolen");
        request.put("claimantName", "Test User 3");
        request.put("claimantPhone", "555-0003");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        // BUG: This assertion will FAIL because the triage rule checks "Theft" != "THEFT"
        // The theft claim gets incorrectly assigned to ADJUSTER instead of SENIOR_ADJUSTER
        assertEquals("SENIOR_ADJUSTER", adjuster.getRole(),
                "THEFT claims should be assigned to a Senior Adjuster");
    }

    @Test
    void testReserveDecision_ApproveWithAmount() {
        Claim claim = claimService.getClaimById(1L);
        Claim updated = claimService.setReserveDecision(1L, "APPROVE", new BigDecimal("5000.00"));

        assertEquals("RESERVE_SET", updated.getStatus());
        assertEquals(new BigDecimal("5000.00"), updated.getReserveAmount());
    }

    /**
     * This test exposes the intentional reserve calculation rounding bug.
     * When no amount is provided, the auto-calculation uses double arithmetic,
     * which can produce rounding errors.
     */
    @Test
    @Tag("known-defect")
    void testReserveDecision_AutoCalculation_RoundingBug() {
        // Create a claim with severity 7
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 7);
        request.put("lossDate", "2024-10-05");
        request.put("lossDescription", "Hail damage");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0005");

        Claim claim = claimService.createClaim(request);
        Claim updated = claimService.setReserveDecision(claim.getId(), "APPROVE", null);

        // Expected: 7 * 1000 * 1.15 = 8050.00
        // BUG: due to double arithmetic and (long) cast, result is 8050 (happens to work for 7)
        // but for severity 3: 3 * 1000 * 1.15 = 3449.9999... → 3449 instead of 3450
        assertEquals(new BigDecimal("8050"), updated.getReserveAmount(),
                "Reserve should be severity * 1000 * 1.15");
    }

    @Test
    @Tag("known-defect")
    void testReserveDecision_AutoCalculation_RoundingBug_Severity3() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 2L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-10-06");
        request.put("lossDescription", "Minor hail");
        request.put("claimantName", "Test Rounding");
        request.put("claimantPhone", "555-0006");

        Claim claim = claimService.createClaim(request);
        Claim updated = claimService.setReserveDecision(claim.getId(), "APPROVE", null);

        // Expected: 3 * 1000 * 1.15 = 3450.00
        // BUG: double arithmetic gives 3449.9999... → (long) cast = 3449
        assertEquals(new BigDecimal("3450"), updated.getReserveAmount(),
                "Reserve should be 3450 but rounding bug produces 3449");
    }

    @Test
    void testIssuePayment() {
        // Use claim 3 which has RESERVE_SET status
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        payRequest.put("createdBy", "testuser");

        Payment payment = claimService.issuePayment(3L, payRequest);

        assertNotNull(payment.getId());
        assertEquals(new BigDecimal("3000.00"), payment.getAmount());
        assertEquals("COMPLETED", payment.getStatus());

        Claim claim = claimService.getClaimById(3L);
        assertEquals("SETTLED", claim.getStatus());
    }

    @Test
    void testCloseClaim_WithSubrogation() {
        // Settle claim 3 first, then close
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        claimService.issuePayment(3L, payRequest);

        Claim closed = claimService.closeClaim(3L, true);
        assertEquals("CLOSED", closed.getStatus());
        assertTrue(closed.getSubrogationFlag());
    }

    @Test
    void testCloseClaim_WithoutSubrogation() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        claimService.issuePayment(3L, payRequest);

        Claim closed = claimService.closeClaim(3L, false);
        assertEquals("CLOSED", closed.getStatus());
        assertFalse(closed.getSubrogationFlag());
    }

    // --- Additional tests ---

    @Test
    void testGetAllClaims() {
        List<Claim> claims = claimService.getAllClaims();
        assertNotNull(claims);
        assertFalse(claims.isEmpty(), "Seeded data should contain claims");
    }

    @Test
    void testGetClaimsByStatus() {
        List<Claim> openClaims = claimService.getClaimsByStatus("OPEN");
        assertNotNull(openClaims);
        for (Claim c : openClaims) {
            assertEquals("OPEN", c.getStatus());
        }
    }

    @Test
    void testGetClaimById_NotFound() {
        assertThrows(RuntimeException.class, () -> claimService.getClaimById(9999L));
    }

    @Test
    void testUpdateClaimStatus() {
        Claim updated = claimService.updateClaimStatus(1L, "UNDER_INVESTIGATION", "testuser");
        assertEquals("UNDER_INVESTIGATION", updated.getStatus());

        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        boolean found = events.stream()
                .anyMatch(e -> "UNDER_INVESTIGATION".equals(e.getNewStatus())
                        && "testuser".equals(e.getCreatedBy()));
        assertTrue(found, "Should have a STATUS_CHANGE event for the update");
    }

    @Test
    void testManualAssignClaim() {
        // Use claim 1 and user 2 (an adjuster from seed data)
        Assignment assignment = claimService.manualAssignClaim(1L, 2L, "Test manual assign");
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertEquals(2L, assignment.getAdjusterId());
        assertEquals("Test manual assign", assignment.getNotes());
    }

    @Test
    void testManualAssignClaim_UserNotFound() {
        assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(1L, 9999L, "Should fail"));
    }

    @Test
    void testAddDocument() {
        Map<String, String> docRequest = new HashMap<>();
        docRequest.put("fileName", "test-report.pdf");
        docRequest.put("documentType", "POLICE_REPORT");
        docRequest.put("uploadedBy", "testuser");
        docRequest.put("notes", "Test document");

        DocumentMetadata doc = claimService.addDocument(1L, docRequest);
        assertNotNull(doc.getId());
        assertEquals("test-report.pdf", doc.getFileName());
        assertEquals("POLICE_REPORT", doc.getDocumentType());
        assertEquals("testuser", doc.getUploadedBy());
    }

    @Test
    void testReserveDecision_Deny() {
        Claim denied = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", denied.getStatus());
    }

    @Test
    void testGetClaimEvents() {
        // Claim 1 should have at least the initial FNOL event from seed data
        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        assertNotNull(events);
        assertFalse(events.isEmpty(), "Claim should have events from seed data");
    }

    @Test
    void testGetClaimAssignments() {
        // Create an assignment first, then retrieve
        claimService.autoAssignClaim(1L);
        List<Assignment> assignments = claimService.getClaimAssignments(1L);
        assertNotNull(assignments);
        assertFalse(assignments.isEmpty());
    }

    @Test
    void testGetClaimDocuments() {
        // Add a document first, then retrieve
        Map<String, String> docRequest = new HashMap<>();
        docRequest.put("fileName", "evidence.jpg");
        docRequest.put("documentType", "PHOTO");
        docRequest.put("uploadedBy", "testuser");
        docRequest.put("notes", "");
        claimService.addDocument(1L, docRequest);

        List<DocumentMetadata> docs = claimService.getClaimDocuments(1L);
        assertNotNull(docs);
        assertFalse(docs.isEmpty());
    }

    @Test
    void testGetClaimPayments() {
        // Issue a payment first using claim 3 (RESERVE_SET status)
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "2500.00");
        claimService.issuePayment(3L, payRequest);

        List<Payment> payments = claimService.getClaimPayments(3L);
        assertNotNull(payments);
        assertFalse(payments.isEmpty());
    }
}
