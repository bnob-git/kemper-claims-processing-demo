package com.pnc.claims.repository;

import com.pnc.claims.entity.Claim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.Optional;

public interface ClaimRepository extends JpaRepository<Claim, Long>,
        JpaSpecificationExecutor<Claim> {
    Optional<Claim> findByClaimNumber(String claimNumber);
    List<Claim> findByStatus(String status);
    long countByStatus(String status);
}
