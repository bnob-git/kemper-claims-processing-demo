package com.pnc.claims.service;

import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.NotificationLog;
import com.pnc.claims.repository.NotificationLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private static final Logger log =
            LoggerFactory.getLogger(NotificationService.class);

    private final NotificationLogRepository notificationLogRepository;

    public NotificationService(
            NotificationLogRepository notificationLogRepository) {
        this.notificationLogRepository = notificationLogRepository;
    }

    public void notifyStatusChange(Claim claim,
                                    String oldStatus,
                                    String newStatus) {
        String recipientEmail = claim.getPolicy() != null
                ? claim.getPolicy().getHolderEmail()
                : "unknown@example.com";
        String subject = "Claim " + claim.getClaimNumber()
                + " status changed to " + newStatus;
        String body = "Dear policyholder,\n\n"
                + "Your claim " + claim.getClaimNumber()
                + " has been updated.\n"
                + "Previous status: " + oldStatus + "\n"
                + "New status: " + newStatus + "\n\n"
                + "Thank you,\nPNC Claims Team";

        NotificationLog entry = new NotificationLog();
        entry.setClaimId(claim.getId());
        entry.setRecipientEmail(recipientEmail);
        entry.setSubject(subject);
        entry.setBody(body);
        entry.setStatus("PENDING");

        notificationLogRepository.save(entry);

        log.info("Notification logged for claim {} — "
                        + "recipient={}, subject={}",
                claim.getClaimNumber(), recipientEmail, subject);
    }

    public List<NotificationLog> getNotificationsForClaim(
            Long claimId) {
        return notificationLogRepository
                .findByClaimIdOrderByCreatedAtDesc(claimId);
    }
}
