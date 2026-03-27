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

    private final NotificationLogRepository repository;

    public NotificationService(
            NotificationLogRepository repository) {
        this.repository = repository;
    }

    /**
     * Log a notification record for a claim status change.
     * No real email is sent — this is a stub.
     */
    public NotificationLog notifyStatusChange(
            Claim claim, String oldStatus, String newStatus) {
        String email = claim.getPolicy() != null
                ? claim.getPolicy().getHolderEmail()
                : "unknown@example.com";

        String msg = String.format(
                "Claim %s status changed from %s to %s",
                claim.getClaimNumber(), oldStatus, newStatus);

        NotificationLog entry = new NotificationLog();
        entry.setClaimId(claim.getId());
        entry.setRecipientEmail(email);
        entry.setEventType("STATUS_CHANGE");
        entry.setMessage(msg);

        NotificationLog saved = repository.save(entry);

        log.info("[EMAIL STUB] To: {}, Claim: {}, {}",
                email, claim.getClaimNumber(), msg);

        return saved;
    }

    public List<NotificationLog> getNotifications(
            Long claimId) {
        return repository
                .findByClaimIdOrderBySentAtDesc(claimId);
    }
}
