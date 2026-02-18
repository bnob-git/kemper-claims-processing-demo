package com.pnc.claims.repository;

import com.pnc.claims.entity.ClaimEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ClaimEventRepository extends JpaRepository<ClaimEvent, Long> {
    List<ClaimEvent> findByClaimIdOrderByCreatedAtAsc(Long claimId);
}
