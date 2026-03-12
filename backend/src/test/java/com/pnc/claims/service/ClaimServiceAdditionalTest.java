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

    @Test
    void testGetAllClaims() {
        List<Claim> claims = claimService.getAllClaims();
        assertFalse(claims.isEmpty());
        assertTrue(claims.size() >= 5);
    }

    @Test
    void testGetClaimsByStatus_open() {
        List<Claim> openClaims = claimService.getClaimsByStatus("OPEN");
        assertFalse(openClaims.isEmpty());
        openClaims.forEach(c -> assertEquals("OPEN", c.getStatus()));
    }

    @Test
    void testGetClaimsByStatus_closed() {
        List<Claim> closedClaims = claimService.getClaimsByStatus("CLOSED");
        assertFalse(closedClaims.isEmpty());
        closedClaims.forEach(c -> assertEquals("CLOSED", c.getStatus()));
    }

    @Test
    void testGetClaimsByStatus_noResults() {
        List<Claim> claims = claimService.getClaimsByStatus("NONEXISTENT");
        assertTrue(claims.isEmpty());
    }

    @Test
    void testGetClaimById_exists() {
        Claim claim = claimService.getClaimById(1L);
        assertNotNull(claim);
        assertEquals(1L, claim.getId());
        assertEquals("CLM-2024-0001", claim.getClaimNumber());
    }

    @Test
    void testGetClaimById_notFound() {
        assertThrows(RuntimeException.class, () -> claimService.getClaimById(9999L));
    }

    @Test
    void testUpdateClaimStatus() {
        Claim updated = claimService.updateClaimStatus(1L, "UNDER_INVESTIGATION", "testuser");
        assertEquals("UNDER_INVESTIGATION", updated.getStatus());
    }

    @Test
    void testManualAssignClaim() {
        Assignment assignment = claimService.manualAssignClaim(1L, 2L, "Test manual assignment");
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertEquals(2L, assignment.getAdjusterId());
        assertEquals("Test manual assignment", assignment.getNotes());
    }

    @Test
    void testManualAssignClaim_withNullNotes() {
        Assignment assignment = claimService.manualAssignClaim(1L, 1L, null);
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertNotNull(assignment.getNotes());
    }

    @Test
    void testManualAssignClaim_userNotFound() {
        assertThrows(RuntimeException.class, () -> claimService.manualAssignClaim(1L, 9999L, "Test"));
    }

    @Test
    void testSetReserveDecision_deny() {
        Claim denied = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", denied.getStatus());
    }

    @Test
    void testSetReserveDecision_approveAutoCalc() {
        Claim approved = claimService.setReserveDecision(1L, "APPROVE", null);
        assertEquals("RESERVE_SET", approved.getStatus());
        assertNotNull(approved.getReserveAmount());
    }

    @Test
    void testAddDocument() {
        Map<String, String> request = new HashMap<>();
        request.put("fileName", "test.pdf");
        request.put("documentType", "POLICE_REPORT");
        request.put("uploadedBy", "testuser");
        request.put("notes", "Test doc");

        DocumentMetadata doc = claimService.addDocument(1L, request);
        assertNotNull(doc.getId());
        assertEquals("test.pdf", doc.getFileName());
        assertEquals("POLICE_REPORT", doc.getDocumentType());
        assertEquals("testuser", doc.getUploadedBy());
        assertEquals(1L, doc.getClaimId());
    }

    @Test
    void testAddDocument_claimNotFound() {
        Map<String, String> request = new HashMap<>();
        request.put("fileName", "test.pdf");
        request.put("documentType", "POLICE_REPORT");
        assertThrows(RuntimeException.class, () -> claimService.addDocument(9999L, request));
    }

    @Test
    void testGetClaimEvents() {
        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        assertFalse(events.isEmpty());
    }

    @Test
    void testGetClaimAssignments() {
        List<Assignment> assignments = claimService.getClaimAssignments(1L);
        assertFalse(assignments.isEmpty());
    }

    @Test
    void testGetClaimDocuments() {
        List<DocumentMetadata> docs = claimService.getClaimDocuments(1L);
        assertFalse(docs.isEmpty());
    }

    @Test
    void testGetClaimPayments() {
        List<Payment> payments = claimService.getClaimPayments(4L);
        assertFalse(payments.isEmpty());
    }

    @Test
    void testGetClaimPayments_noneExist() {
        List<Payment> payments = claimService.getClaimPayments(1L);
        assertTrue(payments.isEmpty());
    }

    @Test
    void testIssuePayment_setsSettlementAmount() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "5000.00");
        payRequest.put("createdBy", "testuser");

        Payment payment = claimService.issuePayment(3L, payRequest);
        assertNotNull(payment.getReferenceNumber());
        assertTrue(payment.getReferenceNumber().startsWith("PAY-"));
        assertEquals("SETTLEMENT", payment.getPaymentType());
        assertNotNull(payment.getPaymentDate());

        Claim claim = claimService.getClaimById(3L);
        assertEquals(new BigDecimal("5000.00"), claim.getSettlementAmount());
        assertEquals("SETTLED", claim.getStatus());
    }

    @Test
    void testIssuePayment_defaultCreatedBy() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "2000.00");

        Payment payment = claimService.issuePayment(3L, payRequest);
        assertEquals("system", payment.getCreatedBy());
    }

    @Test
    void testAutoAssignClaim_weatherLowSeverity() {
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
        assertNotNull(assignment.getAssignedDate());
    }

    @Test
    void testCreateClaim_generatesClaimNumber() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 2L);
        request.put("lossType", "VANDALISM");
        request.put("severityScore", 6);
        request.put("lossDate", "2024-11-01");
        request.put("lossDescription", "Vandalism test");
        request.put("claimantName", "Claim Number Test");
        request.put("claimantPhone", "555-7777");

        Claim claim = claimService.createClaim(request);
        assertTrue(claim.getClaimNumber().startsWith("CLM-"));
        assertNotNull(claim.getReportedDate());
        assertFalse(claim.getSubrogationFlag());
    }
}
