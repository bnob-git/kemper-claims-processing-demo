package com.pnc.claims.repository;

import com.pnc.claims.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {
    List<Assignment> findByClaimId(Long claimId);
}
