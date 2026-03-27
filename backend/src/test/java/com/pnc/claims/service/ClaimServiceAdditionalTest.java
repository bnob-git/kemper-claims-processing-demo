package com.pnc.claims.service;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
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
class ClaimServiceAdditionalTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testGetAllClaims() {
        List<Claim> claims = claimService.getAllClaims();
        assertNotNull(claims);
        assertTrue(claims.size() >= 5);
    }

    @Test
    void testGetClaimsByStatus_Open() {
        List<Claim> claims = claimService.getClaimsByStatus("OPEN");
        assertNotNull(claims);
        assertTrue(claims.size() >= 1);
        claims.forEach(c -> assertEquals("OPEN", c.getStatus()));
    }

    @Test
    void testGetClaimsByStatus_Closed() {
        List<Claim> claims = claimService.getClaimsByStatus("CLOSED");
        assertNotNull(claims);
        claims.forEach(c -> assertEquals("CLOSED", c.getStatus()));
    }

    @Test
    void testGetClaimById_Existing() {
        Claim claim = claimService.getClaimById(1L);
        assertNotNull(claim);
        assertEquals("CLM-2024-0001", claim.getClaimNumber());
    }

    @Test
    void testGetClaimById_NonExisting_ThrowsException() {
        assertThrows(RuntimeException.class, () -> claimService.getClaimById(9999L));
    }

    @Test
    void testUpdateClaimStatus() {
        Claim updated = claimService.updateClaimStatus(1L, "UNDER_INVESTIGATION", "testuser");
        assertEquals("UNDER_INVESTIGATION", updated.getStatus());
    }

    @Test
    void testManualAssignClaim_WithNotes() {
        Assignment assignment = claimService.manualAssignClaim(1L, 2L, "Test notes");
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertEquals("Test notes", assignment.getNotes());
        assertEquals(2L, assignment.getAdjusterId());
    }

    @Test
    void testManualAssignClaim_WithoutNotes() {
        Assignment assignment = claimService.manualAssignClaim(1L, 1L, null);
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertTrue(assignment.getNotes().contains("Manually assigned to"));
    }

    @Test
    void testManualAssignClaim_NonExistingUser_ThrowsException() {
        assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(1L, 9999L, "notes"));
    }

    @Test
    void testSetReserveDecision_Deny() {
        Claim claim = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", claim.getStatus());
    }

    @Test
    void testSetReserveDecision_ApproveAutoCalcSeverity5() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-0001");
        Claim claim = claimService.createClaim(request);

        Claim updated = claimService.setReserveDecision(claim.getId(), "APPROVE", null);
        assertEquals("RESERVE_SET", updated.getStatus());
        assertNotNull(updated.getReserveAmount());
    }

    @Test
    void testAddDocument() {
        Map<String, String> request = new HashMap<>();
        request.put("fileName", "test_document.pdf");
        request.put("documentType", "POLICE_REPORT");
        request.put("uploadedBy", "testuser");
        request.put("notes", "Test notes");

        DocumentMetadata doc = claimService.addDocument(1L, request);
        assertNotNull(doc.getId());
        assertEquals("test_document.pdf", doc.getFileName());
        assertEquals("POLICE_REPORT", doc.getDocumentType());
        assertEquals("testuser", doc.getUploadedBy());
        assertEquals("Test notes", doc.getNotes());
    }

    @Test
    void testAddDocument_NonExistingClaim_ThrowsException() {
        Map<String, String> request = new HashMap<>();
        request.put("fileName", "test.pdf");
        request.put("documentType", "OTHER");

        assertThrows(RuntimeException.class, () -> claimService.addDocument(9999L, request));
    }

    @Test
    void testGetClaimEvents() {
        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        assertNotNull(events);
        assertTrue(events.size() >= 1);
    }

    @Test
    void testGetClaimAssignments() {
        List<Assignment> assignments = claimService.getClaimAssignments(1L);
        assertNotNull(assignments);
        assertTrue(assignments.size() >= 1);
    }

    @Test
    void testGetClaimDocuments() {
        List<DocumentMetadata> docs = claimService.getClaimDocuments(1L);
        assertNotNull(docs);
        assertTrue(docs.size() >= 1);
    }

    @Test
    void testGetClaimPayments() {
        List<Payment> payments = claimService.getClaimPayments(4L);
        assertNotNull(payments);
        assertTrue(payments.size() >= 1);
    }

    @Test
    void testGetClaimPayments_NoPayments() {
        List<Payment> payments = claimService.getClaimPayments(1L);
        assertNotNull(payments);
        assertEquals(0, payments.size());
    }

    @Test
    void testAutoAssign_LowSeverityWeather_AssignsAdjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Minor weather damage");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-0001");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        assertEquals("AUTO", assignment.getAssignmentType());
        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("ADJUSTER", adjuster.getRole());
    }

    @Test
    void testIssuePayment_WithoutCreatedBy() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "2500.00");

        Payment payment = claimService.issuePayment(3L, payRequest);
        assertNotNull(payment.getId());
        assertEquals(new BigDecimal("2500.00"), payment.getAmount());
        assertEquals("system", payment.getCreatedBy());
    }

    @Test
    void testCreateClaim_GeneratesClaimNumber() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 2L);
        request.put("lossType", "VANDALISM");
        request.put("severityScore", 6);
        request.put("lossDate", "2024-11-01");
        request.put("lossDescription", "Vandalism damage");
        request.put("claimantName", "Jane Doe");
        request.put("claimantPhone", "555-9876");

        Claim claim = claimService.createClaim(request);
        assertNotNull(claim.getClaimNumber());
        assertTrue(claim.getClaimNumber().startsWith("CLM-"));
        assertEquals("VANDALISM", claim.getLossType());
        assertEquals(6, claim.getSeverityScore());
        assertNotNull(claim.getReportedDate());
    }

    @Test
    void testFullClaimLifecycle() {
        // Create
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 4L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 8);
        request.put("lossDate", "2024-12-01");
        request.put("lossDescription", "Major collision");
        request.put("claimantName", "Lifecycle Test");
        request.put("claimantPhone", "555-0000");
        Claim claim = claimService.createClaim(request);
        assertEquals("OPEN", claim.getStatus());

        // Auto-assign
        Assignment assignment = claimService.autoAssignClaim(claim.getId());
        assertNotNull(assignment);

        // Update status
        claim = claimService.updateClaimStatus(claim.getId(), "UNDER_INVESTIGATION", "testuser");
        assertEquals("UNDER_INVESTIGATION", claim.getStatus());

        // Set reserve
        claim = claimService.setReserveDecision(claim.getId(), "APPROVE", new BigDecimal("10000.00"));
        assertEquals("RESERVE_SET", claim.getStatus());

        // Issue payment
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "9500.00");
        payRequest.put("createdBy", "testuser");
        Payment payment = claimService.issuePayment(claim.getId(), payRequest);
        assertNotNull(payment);
        claim = claimService.getClaimById(claim.getId());
        assertEquals("SETTLED", claim.getStatus());

        // Close
        claim = claimService.closeClaim(claim.getId(), true);
        assertEquals("CLOSED", claim.getStatus());
        assertTrue(claim.getSubrogationFlag());

        // Verify events were created
        List<ClaimEvent> events = claimService.getClaimEvents(claim.getId());
        assertTrue(events.size() >= 3);
    }
}
