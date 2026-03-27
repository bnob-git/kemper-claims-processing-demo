package com.pnc.claims.repository;

import com.pnc.claims.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {
    List<NotificationLog> findByClaimIdOrderBySentAtDesc(Long claimId);
}
