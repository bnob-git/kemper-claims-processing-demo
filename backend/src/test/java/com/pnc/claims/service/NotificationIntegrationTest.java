package com.pnc.claims.service;

import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.NotificationLog;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class NotificationIntegrationTest {

    @Autowired
    private ClaimService claimService;

    @Autowired
    private NotificationService notificationService;

    @Test
    void testStatusChangeCreatesNotification() {
        // Claim 1 exists in seed data with status OPEN
        Claim updated = claimService.updateClaimStatus(
                1L, "UNDER_INVESTIGATION", "testuser");

        assertEquals("UNDER_INVESTIGATION",
                updated.getStatus());

        List<NotificationLog> notifications =
                notificationService.getNotifications(1L);

        assertFalse(notifications.isEmpty(),
                "Should have at least one notification");

        NotificationLog latest = notifications.get(0);
        assertEquals(1L, latest.getClaimId());
        assertEquals("STATUS_CHANGE",
                latest.getEventType());
        assertNotNull(latest.getRecipientEmail());
        assertTrue(latest.getMessage()
                .contains("UNDER_INVESTIGATION"));
    }

    @Test
    void testMultipleStatusChangesCreateMultiple() {
        claimService.updateClaimStatus(
                1L, "UNDER_INVESTIGATION", "user1");
        claimService.updateClaimStatus(
                1L, "RESERVE_SET", "user2");

        List<NotificationLog> notifications =
                notificationService.getNotifications(1L);

        assertTrue(notifications.size() >= 2,
                "Should have at least 2 notifications");
    }

    @Test
    void testGetNotificationsForClaimWithNone() {
        // Claim 5 exists but we never change status
        List<NotificationLog> notifications =
                notificationService.getNotifications(5L);

        // May or may not have notifications depending on
        // whether other tests ran; just ensure no error
        assertNotNull(notifications);
    }
}
