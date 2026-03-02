package com.pnc.claims.service;

import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.NotificationLog;
import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.NotificationLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationLogRepository repository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(repository);
    }

    @Test
    void testNotifyStatusChange_savesLogEntry() {
        Policy policy = new Policy();
        policy.setHolderEmail("john@example.com");

        Claim claim = new Claim();
        claim.setId(1L);
        claim.setClaimNumber("CLM-0001");
        claim.setPolicy(policy);

        when(repository.save(any(NotificationLog.class)))
                .thenAnswer(inv -> {
                    NotificationLog n = inv.getArgument(0);
                    n.setId(100L);
                    return n;
                });

        NotificationLog result = notificationService
                .notifyStatusChange(claim, "OPEN", "TRIAGE");

        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals(1L, result.getClaimId());
        assertEquals("john@example.com",
                result.getRecipientEmail());
        assertEquals("STATUS_CHANGE", result.getEventType());
        assertTrue(result.getMessage()
                .contains("OPEN"));
        assertTrue(result.getMessage()
                .contains("TRIAGE"));

        verify(repository, times(1))
                .save(any(NotificationLog.class));
    }

    @Test
    void testNotifyStatusChange_nullPolicy() {
        Claim claim = new Claim();
        claim.setId(2L);
        claim.setClaimNumber("CLM-0002");
        claim.setPolicy(null);

        when(repository.save(any(NotificationLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        NotificationLog result = notificationService
                .notifyStatusChange(claim, "OPEN", "CLOSED");

        assertEquals("unknown@example.com",
                result.getRecipientEmail());
    }

    @Test
    void testGetNotifications_returnsList() {
        NotificationLog n1 = new NotificationLog();
        n1.setId(1L);
        n1.setClaimId(5L);

        NotificationLog n2 = new NotificationLog();
        n2.setId(2L);
        n2.setClaimId(5L);

        when(repository.findByClaimIdOrderBySentAtDesc(5L))
                .thenReturn(List.of(n1, n2));

        List<NotificationLog> results =
                notificationService.getNotifications(5L);

        assertEquals(2, results.size());
        verify(repository)
                .findByClaimIdOrderBySentAtDesc(5L);
    }

    @Test
    void testGetNotifications_emptyList() {
        when(repository.findByClaimIdOrderBySentAtDesc(99L))
                .thenReturn(List.of());

        List<NotificationLog> results =
                notificationService.getNotifications(99L);

        assertTrue(results.isEmpty());
    }

    @Test
    void testNotifyStatusChange_messageFormat() {
        Policy policy = new Policy();
        policy.setHolderEmail("test@test.com");

        Claim claim = new Claim();
        claim.setId(3L);
        claim.setClaimNumber("CLM-ABC123");
        claim.setPolicy(policy);

        when(repository.save(any(NotificationLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        NotificationLog result = notificationService
                .notifyStatusChange(
                        claim, "RESERVE_SET", "SETTLED");

        String expected = "Claim CLM-ABC123 status changed"
                + " from RESERVE_SET to SETTLED";
        assertEquals(expected, result.getMessage());
    }
}
