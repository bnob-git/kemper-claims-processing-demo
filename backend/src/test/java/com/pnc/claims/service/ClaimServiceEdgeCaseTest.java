package com.pnc.claims.service;

import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.NotificationLog;
import com.pnc.claims.repository.NotificationLogRepository;
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
class ClaimServiceEdgeCaseTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationLogRepository notificationLogRepository;

    @Test
    void getClaimById_nonExistent_shouldThrow() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.getClaimById(99999L));
        assertTrue(ex.getMessage().contains("Claim not found"));
    }

    @Test
    void manualAssign_invalidAdjusterId_shouldThrow() {
        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(
                        1L, 99999L, "test notes"));
        assertTrue(ex.getMessage().contains("User not found"));
    }

    @Test
    void reserveDecision_deny_shouldSetDeniedStatus() {
        Claim claim = claimService.setReserveDecision(
                1L, "DENY", null);
        assertEquals("DENIED", claim.getStatus());
    }

    @Test
    void reserveDecision_deny_shouldCreateNotification() {
        claimService.setReserveDecision(1L, "DENY", null);
        List<NotificationLog> notifications =
                notificationService.getNotificationsForClaim(1L);
        assertFalse(notifications.isEmpty());
        assertTrue(notifications.stream().anyMatch(
                n -> n.getSubject().contains("DENIED")));
    }

    @Test
    void updateClaimStatus_shouldCreateNotification() {
        claimService.updateClaimStatus(
                1L, "UNDER_INVESTIGATION", "testuser");
        List<NotificationLog> notifications =
                notificationService.getNotificationsForClaim(1L);
        assertFalse(notifications.isEmpty());
        assertTrue(notifications.stream().anyMatch(
                n -> n.getSubject().contains("UNDER_INVESTIGATION")));
    }

    @Test
    void issuePayment_shouldCreateNotification() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        claimService.issuePayment(3L, payRequest);

        List<NotificationLog> notifications =
                notificationService.getNotificationsForClaim(3L);
        assertFalse(notifications.isEmpty());
        assertTrue(notifications.stream().anyMatch(
                n -> n.getSubject().contains("SETTLED")));
    }

    @Test
    void closeClaim_shouldCreateNotification() {
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        claimService.issuePayment(3L, payRequest);
        claimService.closeClaim(3L, false);

        List<NotificationLog> notifications =
                notificationService.getNotificationsForClaim(3L);
        assertTrue(notifications.stream().anyMatch(
                n -> n.getSubject().contains("CLOSED")));
    }

    @Test
    void createClaim_missingPolicy_shouldThrow() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 99999L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test");
        request.put("claimantName", "Test");
        request.put("claimantPhone", "555");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.createClaim(request));
        assertTrue(ex.getMessage().contains("Policy not found"));
    }
}
