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

/**
 * Edge-case and error-path tests for ClaimService.
 * Covers: FNOL validation, DENY path, payment on wrong status,
 * close on wrong status, and manual assignment with invalid adjuster.
 */
@SpringBootTest
@Transactional
class ClaimServiceEdgeCaseTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private ClaimRepository claimRepository;

    // ---- 1. FNOL creation with missing required fields ----

    @Test
    void testCreateClaim_MissingPolicyId_ThrowsException() {
        Map<String, Object> request = new HashMap<>();
        // policyId is missing
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0001");

        assertThrows(Exception.class, () -> claimService.createClaim(request),
                "Creating a claim without policyId should throw an exception");
    }

    @Test
    void testCreateClaim_MissingSeverityScore_ThrowsException() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        // severityScore is missing
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0002");

        assertThrows(Exception.class, () -> claimService.createClaim(request),
                "Creating a claim without severityScore should throw an exception");
    }

    @Test
    void testCreateClaim_InvalidPolicyId_ThrowsException() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 99999L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0003");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.createClaim(request));
        assertTrue(ex.getMessage().contains("Policy not found"),
                "Should indicate policy not found");
    }

    // ---- 2. Reserve decision DENY path ----

    @Test
    void testReserveDecision_Deny_StatusChangesToDenied() {
        // Claim 1 is in OPEN status
        Claim denied = claimService.setReserveDecision(1L, "DENY", null);

        assertEquals("DENIED", denied.getStatus(),
                "Denying reserve should set status to DENIED");
        assertNull(denied.getReserveAmount(),
                "Denied claim should have no reserve amount");
    }

    @Test
    void testReserveDecision_Deny_PreservesNullReserve() {
        // Create a fresh claim, deny its reserve
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 2L);
        request.put("lossType", "WEATHER");
        request.put("severityScore", 4);
        request.put("lossDate", "2024-11-01");
        request.put("lossDescription", "Hail damage deny test");
        request.put("claimantName", "Deny Test");
        request.put("claimantPhone", "555-7777");

        Claim claim = claimService.createClaim(request);
        Claim denied = claimService.setReserveDecision(claim.getId(), "DENY", null);

        assertEquals("DENIED", denied.getStatus());
        assertNull(denied.getReserveAmount());
    }

    // ---- 3. Payment issuance on a claim not in RESERVE_SET status ----

    @Test
    void testIssuePayment_OnOpenClaim_ShouldStillProcess() {
        // Claim 1 is in OPEN status (not RESERVE_SET).
        // The current service does not guard against this; the test
        // documents the actual behaviour (it processes anyway).
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "1000.00");
        payRequest.put("createdBy", "testuser");

        // Service currently allows payment on any status and moves to SETTLED
        Payment payment = claimService.issuePayment(1L, payRequest);
        assertNotNull(payment.getId());
        assertEquals("COMPLETED", payment.getStatus());

        Claim claim = claimService.getClaimById(1L);
        assertEquals("SETTLED", claim.getStatus(),
                "Even an OPEN claim gets moved to SETTLED when payment is issued");
    }

    // ---- 4. Closing a claim not in SETTLED status ----

    @Test
    void testCloseClaim_OnOpenClaim_ShouldStillProcess() {
        // Claim 1 is in OPEN status (not SETTLED).
        // The service does not guard against this; test documents behaviour.
        Claim closed = claimService.closeClaim(1L, false);
        assertEquals("CLOSED", closed.getStatus(),
                "Service closes claim regardless of current status");
    }

    // ---- 5. Manual assignment with invalid adjuster ID ----

    @Test
    void testManualAssign_InvalidAdjusterId_ThrowsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(1L, 99999L, "test notes"));
        assertTrue(ex.getMessage().contains("User not found"),
                "Should indicate user not found for invalid adjuster ID");
    }

    @Test
    void testManualAssign_InvalidClaimId_ThrowsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(99999L, 1L, "test notes"));
        assertTrue(ex.getMessage().contains("Claim not found"),
                "Should indicate claim not found for invalid claim ID");
    }

    // ---- 6. getClaimById for non-existent claim ----

    @Test
    void testGetClaimById_NonExistent_ThrowsException() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.getClaimById(99999L));
        assertTrue(ex.getMessage().contains("Claim not found"));
    }
}
