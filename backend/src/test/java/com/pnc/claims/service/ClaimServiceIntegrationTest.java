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
class ClaimServiceIntegrationTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    @Test
    void getAllClaims_returnsSeededClaims() {
        List<Claim> claims = claimService.getAllClaims();
        assertNotNull(claims);
    }

    @Test
    void getClaimsByStatus_returnsFilteredClaims() {
        List<Claim> openClaims = claimService.getClaimsByStatus("OPEN");
        assertNotNull(openClaims);
    }

    @Test
    void updateClaimStatus_changesStatusAndCreatesEvent() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-06-01");
        request.put("lossDescription", "Minor fender bender");
        request.put("claimantName", "Test Person");
        request.put("claimantPhone", "555-0000");

        Claim claim = claimService.createClaim(request);
        Claim updated = claimService.updateClaimStatus(claim.getId(), "UNDER_INVESTIGATION", "admin");

        assertEquals("UNDER_INVESTIGATION", updated.getStatus());

        List<ClaimEvent> events = claimService.getClaimEvents(claim.getId());
        assertTrue(events.size() >= 2);
    }

    @Test
    void manualAssignClaim_createsManualAssignment() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-06-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test Person");
        request.put("claimantPhone", "555-0000");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.manualAssignClaim(claim.getId(), 1L, "Manually assigned");

        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertEquals("Manually assigned", assignment.getNotes());
    }

    @Test
    void manualAssignClaim_withNullNotes() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-06-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test Person");
        request.put("claimantPhone", "555-0000");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.manualAssignClaim(claim.getId(), 1L, null);

        assertNotNull(assignment.getId());
        assertTrue(assignment.getNotes().startsWith("Manually assigned to"));
    }

    @Test
    void setReserveDecision_deny() {
        Claim claim = claimService.getClaimById(1L);
        Claim denied = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", denied.getStatus());
    }

    @Test
    void setReserveDecision_approveAutoCalculation() {
        Claim claim = claimService.getClaimById(1L);
        Claim approved = claimService.setReserveDecision(1L, "APPROVE", null);
        assertEquals("RESERVE_SET", approved.getStatus());
        assertNotNull(approved.getReserveAmount());
    }

    @Test
    void addDocument_createsDocumentMetadata() {
        Map<String, String> request = Map.of(
                "fileName", "evidence.pdf",
                "documentType", "EVIDENCE",
                "uploadedBy", "admin",
                "notes", "Important document"
        );

        DocumentMetadata doc = claimService.addDocument(1L, request);

        assertNotNull(doc.getId());
        assertEquals("evidence.pdf", doc.getFileName());
        assertEquals("EVIDENCE", doc.getDocumentType());
    }

    @Test
    void issuePayment_createsPaymentAndSettles() {
        Map<String, Object> request = new HashMap<>();
        request.put("amount", "5000.00");
        request.put("createdBy", "admin");

        Payment payment = claimService.issuePayment(1L, request);

        assertNotNull(payment.getId());
        assertEquals(new BigDecimal("5000.00"), payment.getAmount());
        assertEquals("SETTLEMENT", payment.getPaymentType());
        assertEquals("COMPLETED", payment.getStatus());
    }

    @Test
    void closeClaim_withSubrogation() {
        Claim closed = claimService.closeClaim(1L, true);
        assertEquals("CLOSED", closed.getStatus());
        assertTrue(closed.getSubrogationFlag());
    }

    @Test
    void closeClaim_withoutSubrogation() {
        Claim closed = claimService.closeClaim(1L, false);
        assertEquals("CLOSED", closed.getStatus());
        assertFalse(closed.getSubrogationFlag());
    }

    @Test
    void getClaimAssignments_returnsAssignments() {
        List<Assignment> assignments = claimService.getClaimAssignments(1L);
        assertNotNull(assignments);
    }

    @Test
    void getClaimDocuments_returnsDocuments() {
        List<DocumentMetadata> docs = claimService.getClaimDocuments(1L);
        assertNotNull(docs);
    }

    @Test
    void getClaimPayments_returnsPayments() {
        List<Payment> payments = claimService.getClaimPayments(1L);
        assertNotNull(payments);
    }

    @Test
    void getClaimById_throwsForMissing() {
        assertThrows(RuntimeException.class, () -> claimService.getClaimById(9999L));
    }
}
