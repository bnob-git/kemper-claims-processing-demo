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
    private NotificationLogRepository notificationLogRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationLogRepository);
    }

    private Claim createClaim(Long id, String claimNumber,
                               String holderEmail) {
        Policy policy = new Policy();
        policy.setHolderEmail(holderEmail);

        Claim claim = new Claim();
        claim.setId(id);
        claim.setClaimNumber(claimNumber);
        claim.setPolicy(policy);
        return claim;
    }

    @Test
    void notifyStatusChange_shouldSaveNotificationLog() {
        Claim claim = createClaim(1L, "CLM-001",
                "alice@example.com");
        when(notificationLogRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        notificationService.notifyStatusChange(
                claim, "OPEN", "UNDER_INVESTIGATION");

        ArgumentCaptor<NotificationLog> captor =
                ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository).save(captor.capture());

        NotificationLog saved = captor.getValue();
        assertEquals(1L, saved.getClaimId());
        assertEquals("alice@example.com", saved.getRecipientEmail());
        assertTrue(saved.getSubject()
                .contains("UNDER_INVESTIGATION"));
        assertTrue(saved.getBody().contains("CLM-001"));
        assertEquals("PENDING", saved.getStatus());
    }

    @Test
    void notifyStatusChange_noPolicyEmail_shouldUseDefault() {
        Claim claim = new Claim();
        claim.setId(2L);
        claim.setClaimNumber("CLM-002");
        claim.setPolicy(null);
        when(notificationLogRepository.save(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        notificationService.notifyStatusChange(
                claim, "OPEN", "CLOSED");

        ArgumentCaptor<NotificationLog> captor =
                ArgumentCaptor.forClass(NotificationLog.class);
        verify(notificationLogRepository).save(captor.capture());
        assertEquals("unknown@example.com",
                captor.getValue().getRecipientEmail());
    }

    @Test
    void getNotificationsForClaim_shouldReturnList() {
        NotificationLog log = new NotificationLog();
        log.setId(1L);
        log.setClaimId(1L);
        when(notificationLogRepository
                .findByClaimIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(log));

        List<NotificationLog> result =
                notificationService.getNotificationsForClaim(1L);
        assertEquals(1, result.size());
    }
}
