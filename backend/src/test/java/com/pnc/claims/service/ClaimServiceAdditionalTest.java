package com.pnc.claims.service;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

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
    void testGetClaimsByStatus() {
        List<Claim> openClaims = claimService.getClaimsByStatus("OPEN");
        assertFalse(openClaims.isEmpty());
        openClaims.forEach(c -> assertEquals("OPEN", c.getStatus()));
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
        Assignment assignment = claimService.manualAssignClaim(1L, 2L, "Test notes");
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertEquals("Test notes", assignment.getNotes());
    }

    @Test
    void testManualAssignClaim_nullNotes() {
        Assignment assignment = claimService.manualAssignClaim(1L, 2L, null);
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertTrue(assignment.getNotes().contains("Manually assigned to"));
    }

    @Test
    void testManualAssignClaim_userNotFound() {
        assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(1L, 9999L, "notes"));
    }

    @Test
    void testAutoAssignClaim_standardClaim() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Standard claim");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-0000");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());
        assertEquals("AUTO", assignment.getAssignmentType());
        assertTrue(assignment.getNotes().contains("Standard assignment"));
    }

    @Test
    void testSetReserveDecision_deny() {
        Claim denied = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", denied.getStatus());
    }

    @Test
    void testAddDocument() {
        Map<String, String> docRequest = new HashMap<>();
        docRequest.put("fileName", "test.pdf");
        docRequest.put("documentType", "EVIDENCE");
        docRequest.put("uploadedBy", "testuser");
        docRequest.put("notes", "Test note");

        DocumentMetadata doc = claimService.addDocument(1L, docRequest);
        assertNotNull(doc.getId());
        assertEquals("test.pdf", doc.getFileName());
        assertEquals("EVIDENCE", doc.getDocumentType());
    }

    @Test
    void testAddDocument_claimNotFound() {
        Map<String, String> docRequest = new HashMap<>();
        docRequest.put("fileName", "test.pdf");
        docRequest.put("documentType", "EVIDENCE");
        assertThrows(RuntimeException.class,
                () -> claimService.addDocument(9999L, docRequest));
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
    void testIssuePayment_defaultCreatedBy() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "2000.00");

        Payment payment = claimService.issuePayment(3L, payRequest);
        assertNotNull(payment.getId());
        assertEquals("system", payment.getCreatedBy());
    }
}
