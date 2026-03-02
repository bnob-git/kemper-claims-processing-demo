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

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private DocumentMetadataRepository documentMetadataRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ClaimEventRepository claimEventRepository;

    // --- getAllClaims ---

    @Test
    void testGetAllClaims_ReturnsSeededData() {
        List<Claim> claims = claimService.getAllClaims();
        assertNotNull(claims);
        assertTrue(claims.size() >= 5, "Should have at least 5 seeded claims");
    }

    // --- getClaimsByStatus ---

    @Test
    void testGetClaimsByStatus_Open() {
        List<Claim> openClaims = claimService.getClaimsByStatus("OPEN");
        assertNotNull(openClaims);
        for (Claim claim : openClaims) {
            assertEquals("OPEN", claim.getStatus());
        }
    }

    @Test
    void testGetClaimsByStatus_Closed() {
        List<Claim> closedClaims = claimService.getClaimsByStatus("CLOSED");
        assertNotNull(closedClaims);
        for (Claim claim : closedClaims) {
            assertEquals("CLOSED", claim.getStatus());
        }
    }

    @Test
    void testGetClaimsByStatus_NonExistent() {
        List<Claim> claims = claimService.getClaimsByStatus("NONEXISTENT");
        assertNotNull(claims);
        assertTrue(claims.isEmpty());
    }

    // --- getClaimById ---

    @Test
    void testGetClaimById_ExistingClaim() {
        Claim claim = claimService.getClaimById(1L);
        assertNotNull(claim);
        assertEquals(1L, claim.getId());
        assertEquals("CLM-2024-0001", claim.getClaimNumber());
    }

    @Test
    void testGetClaimById_NonExistent_ThrowsException() {
        assertThrows(RuntimeException.class, () -> {
            claimService.getClaimById(999L);
        });
    }

    // --- updateClaimStatus ---

    @Test
    void testUpdateClaimStatus_ChangesStatus() {
        Claim updated = claimService.updateClaimStatus(1L, "UNDER_INVESTIGATION", "testuser");
        assertEquals("UNDER_INVESTIGATION", updated.getStatus());
    }

    @Test
    void testUpdateClaimStatus_CreatesEvent() {
        claimService.updateClaimStatus(1L, "UNDER_INVESTIGATION", "testuser");
        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        assertFalse(events.isEmpty());

        ClaimEvent latestEvent = events.get(events.size() - 1);
        assertEquals("STATUS_CHANGE", latestEvent.getEventType());
        assertEquals("UNDER_INVESTIGATION", latestEvent.getNewStatus());
        assertEquals("testuser", latestEvent.getCreatedBy());
    }

    // --- manualAssignClaim ---

    @Test
    void testManualAssignClaim_WithNotes() {
        Assignment assignment = claimService.manualAssignClaim(1L, 2L, "Test manual assignment");
        assertNotNull(assignment.getId());
        assertEquals(1L, assignment.getClaimId());
        assertEquals(2L, assignment.getAdjusterId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertEquals("Test manual assignment", assignment.getNotes());
    }

    @Test
    void testManualAssignClaim_WithoutNotes() {
        Assignment assignment = claimService.manualAssignClaim(1L, 1L, null);
        assertNotNull(assignment.getId());
        assertEquals("MANUAL", assignment.getAssignmentType());
        assertTrue(assignment.getNotes().contains("Manually assigned to"));
    }

    @Test
    void testManualAssignClaim_InvalidUser_ThrowsException() {
        assertThrows(RuntimeException.class, () -> {
            claimService.manualAssignClaim(1L, 999L, "Test");
        });
    }

    @Test
    void testManualAssignClaim_InvalidClaim_ThrowsException() {
        assertThrows(RuntimeException.class, () -> {
            claimService.manualAssignClaim(999L, 1L, "Test");
        });
    }

    // --- autoAssignClaim additional scenarios ---

    @Test
    void testAutoAssignClaim_VandalismLowSeverity_Adjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "VANDALISM");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Vandalism damage");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-1111");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        assertNotNull(assignment);
        assertEquals("AUTO", assignment.getAssignmentType());
        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("ADJUSTER", adjuster.getRole());
    }

    @Test
    void testAutoAssignClaim_WeatherClaim_Adjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 2L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Hail damage");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-2222");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        assertNotNull(assignment);
        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("ADJUSTER", adjuster.getRole());
    }

    @Test
    void testAutoAssignClaim_CollisionSeverity6_Adjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 6);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Mid severity collision");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-3333");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("ADJUSTER", adjuster.getRole());
    }

    @Test
    void testAutoAssignClaim_CollisionSeverity7_SeniorAdjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 7);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "High severity collision");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-4444");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("SENIOR_ADJUSTER", adjuster.getRole());
    }

    // --- setReserveDecision ---

    @Test
    void testSetReserveDecision_Deny() {
        Claim denied = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", denied.getStatus());
    }

    @Test
    void testSetReserveDecision_ApproveAutoCalculation() {
        // Create claim with known severity for auto-calc
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-05");
        request.put("lossDescription", "Test auto calc");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-5555");

        Claim claim = claimService.createClaim(request);
        Claim updated = claimService.setReserveDecision(claim.getId(), "APPROVE", null);

        assertEquals("RESERVE_SET", updated.getStatus());
        assertNotNull(updated.getReserveAmount());
        // severity 5 * 1000 * 1.15 = 5750
        assertEquals(new BigDecimal("5750"), updated.getReserveAmount());
    }

    @Test
    void testSetReserveDecision_ApproveWithExplicitAmount() {
        Claim updated = claimService.setReserveDecision(1L, "APPROVE", new BigDecimal("7500.00"));
        assertEquals("RESERVE_SET", updated.getStatus());
        assertEquals(new BigDecimal("7500.00"), updated.getReserveAmount());
    }

    @Test
    void testSetReserveDecision_DenyCreatesEvent() {
        claimService.setReserveDecision(1L, "DENY", null);
        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        assertFalse(events.isEmpty());

        boolean hasDenyEvent = events.stream()
                .anyMatch(e -> "DENIED".equals(e.getNewStatus()));
        assertTrue(hasDenyEvent);
    }

    // --- addDocument ---

    @Test
    void testAddDocument_Success() {
        Map<String, String> docRequest = new HashMap<>();
        docRequest.put("fileName", "test_photo.jpg");
        docRequest.put("documentType", "PHOTO");
        docRequest.put("uploadedBy", "testuser");
        docRequest.put("notes", "Test photo");

        DocumentMetadata doc = claimService.addDocument(1L, docRequest);
        assertNotNull(doc.getId());
        assertEquals(1L, doc.getClaimId());
        assertEquals("test_photo.jpg", doc.getFileName());
        assertEquals("PHOTO", doc.getDocumentType());
        assertEquals("testuser", doc.getUploadedBy());
    }

    @Test
    void testAddDocument_InvalidClaim_ThrowsException() {
        Map<String, String> docRequest = new HashMap<>();
        docRequest.put("fileName", "test.pdf");
        docRequest.put("documentType", "OTHER");

        assertThrows(RuntimeException.class, () -> {
            claimService.addDocument(999L, docRequest);
        });
    }

    // --- getClaimDocuments ---

    @Test
    void testGetClaimDocuments_ReturnsDocuments() {
        List<DocumentMetadata> docs = claimService.getClaimDocuments(1L);
        assertNotNull(docs);
        // Claim 1 has 1 document in seed data
        assertFalse(docs.isEmpty());
    }

    @Test
    void testGetClaimDocuments_EmptyList() {
        // Create a new claim with no documents
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-11-01");
        request.put("lossDescription", "No docs");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-6666");

        Claim claim = claimService.createClaim(request);
        List<DocumentMetadata> docs = claimService.getClaimDocuments(claim.getId());
        assertNotNull(docs);
        assertTrue(docs.isEmpty());
    }

    // --- getClaimEvents ---

    @Test
    void testGetClaimEvents_ReturnsEvents() {
        List<ClaimEvent> events = claimService.getClaimEvents(1L);
        assertNotNull(events);
        assertFalse(events.isEmpty());
    }

    @Test
    void testGetClaimEvents_NewClaim_HasFnolEvent() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-11-01");
        request.put("lossDescription", "New claim");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-7777");

        Claim claim = claimService.createClaim(request);
        List<ClaimEvent> events = claimService.getClaimEvents(claim.getId());
        assertEquals(1, events.size());
        assertEquals("STATUS_CHANGE", events.get(0).getEventType());
        assertEquals("OPEN", events.get(0).getNewStatus());
        assertEquals("FNOL submitted", events.get(0).getNotes());
    }

    // --- getClaimAssignments ---

    @Test
    void testGetClaimAssignments_ReturnsAssignments() {
        List<Assignment> assignments = claimService.getClaimAssignments(1L);
        assertNotNull(assignments);
        assertFalse(assignments.isEmpty());
    }

    // --- getClaimPayments ---

    @Test
    void testGetClaimPayments_ReturnsPayments() {
        List<Payment> payments = claimService.getClaimPayments(4L);
        assertNotNull(payments);
        assertFalse(payments.isEmpty());
    }

    @Test
    void testGetClaimPayments_NoPayments() {
        List<Payment> payments = claimService.getClaimPayments(1L);
        assertNotNull(payments);
        assertTrue(payments.isEmpty());
    }

    // --- createClaim additional scenarios ---

    @Test
    void testCreateClaim_GeneratesUniqueClaimNumbers() {
        Map<String, Object> request1 = new HashMap<>();
        request1.put("policyId", 1L);
        request1.put("lossType", "COLLISION");
        request1.put("severityScore", 3);
        request1.put("lossDate", "2024-10-01");
        request1.put("lossDescription", "Claim 1");
        request1.put("claimantName", "User1");
        request1.put("claimantPhone", "555-0001");

        Map<String, Object> request2 = new HashMap<>();
        request2.put("policyId", 2L);
        request2.put("lossType", "WEATHER");
        request2.put("severityScore", 5);
        request2.put("lossDate", "2024-10-02");
        request2.put("lossDescription", "Claim 2");
        request2.put("claimantName", "User2");
        request2.put("claimantPhone", "555-0002");

        Claim claim1 = claimService.createClaim(request1);
        Claim claim2 = claimService.createClaim(request2);

        assertNotEquals(claim1.getClaimNumber(), claim2.getClaimNumber());
    }

    @Test
    void testCreateClaim_InvalidPolicy_ThrowsException() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 999L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-0001");

        assertThrows(RuntimeException.class, () -> {
            claimService.createClaim(request);
        });
    }

    @Test
    void testCreateClaim_SetsReportedDate() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555-8888");

        Claim claim = claimService.createClaim(request);
        assertNotNull(claim.getReportedDate());
    }

    // --- issuePayment additional scenarios ---

    @Test
    void testIssuePayment_SetsPaymentFields() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "4500.00");
        payRequest.put("createdBy", "adjuster1");

        Payment payment = claimService.issuePayment(3L, payRequest);
        assertNotNull(payment.getReferenceNumber());
        assertTrue(payment.getReferenceNumber().startsWith("PAY-"));
        assertEquals("SETTLEMENT", payment.getPaymentType());
        assertNotNull(payment.getPaymentDate());
        assertEquals("adjuster1", payment.getCreatedBy());
    }

    @Test
    void testIssuePayment_DefaultCreatedBy() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "2000.00");

        Payment payment = claimService.issuePayment(3L, payRequest);
        assertEquals("system", payment.getCreatedBy());
    }

    @Test
    void testIssuePayment_UpdatesClaimSettlement() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3500.00");

        claimService.issuePayment(3L, payRequest);
        Claim claim = claimService.getClaimById(3L);
        assertEquals("SETTLED", claim.getStatus());
        assertEquals(new BigDecimal("3500.00"), claim.getSettlementAmount());
    }
}
