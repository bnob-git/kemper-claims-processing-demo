package com.pnc.claims.repository;

import com.pnc.claims.entity.DocumentMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentMetadataRepository extends JpaRepository<DocumentMetadata, Long> {
    List<DocumentMetadata> findByClaimId(Long claimId);
}
