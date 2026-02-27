package com.pnc.claims.service;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
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

    @Test
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

    @Test
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

        assertEquals(new BigDecimal("8050.00"), updated.getReserveAmount(),
                "Reserve should be severity * 1000 * 1.15");
    }

    @Test
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

        assertEquals(new BigDecimal("3450.00"), updated.getReserveAmount(),
                "Reserve should be 3450");
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

    // ---- TEST-001: New regression tests ----

    @Test
    void testCreateClaim_MissingRequiredFields_ShouldThrow() {
        Map<String, Object> request = new HashMap<>();
        // Missing policyId, lossType, etc.
        assertThrows(RuntimeException.class, () -> claimService.createClaim(request));
    }

    @Test
    void testReserveDecision_Deny_ShouldSetStatusDenied() {
        Claim updated = claimService.setReserveDecision(1L, "DENY", null);
        assertEquals("DENIED", updated.getStatus());
        assertNull(updated.getReserveAmount());
    }

    @Test
    void testIssuePayment_OnNonReserveSetClaim_ShouldStillProcess() {
        // Claim 1 is OPEN, not RESERVE_SET — service currently allows it
        // This tests the actual behavior of the service
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "1000.00");
        Payment payment = claimService.issuePayment(1L, payRequest);
        assertNotNull(payment.getId());
        assertEquals("SETTLED", claimService.getClaimById(1L).getStatus());
    }

    @Test
    void testCloseClaim_OnNonSettledClaim_ShouldStillProcess() {
        // Claim 1 is OPEN, not SETTLED — service currently allows it
        Claim closed = claimService.closeClaim(1L, false);
        assertEquals("CLOSED", closed.getStatus());
    }

    @Test
    void testManualAssign_InvalidAdjusterId_ShouldThrow() {
        assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(1L, 9999L, "test"));
    }

    @Test
    void testGetClaimById_NonExistent_ShouldThrow() {
        assertThrows(RuntimeException.class, () -> claimService.getClaimById(9999L));
    }

    @Test
    void testGetClaimsByStatus() {
        var openClaims = claimService.getClaimsByStatus("OPEN");
        assertFalse(openClaims.isEmpty());
        openClaims.forEach(c -> assertEquals("OPEN", c.getStatus()));
    }

    @Test
    void testAutoAssign_WeatherClaim_ShouldAssignAdjuster() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 4L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 3);
        request.put("lossDate", "2024-10-07");
        request.put("lossDescription", "Hail");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0007");

        Claim claim = claimService.createClaim(request);
        Assignment assignment = claimService.autoAssignClaim(claim.getId());

        AppUser adjuster = userRepository.findById(assignment.getAdjusterId()).orElseThrow();
        assertEquals("ADJUSTER", adjuster.getRole());
    }
}
