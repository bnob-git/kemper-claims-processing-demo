package com.pnc.claims.repository;

import com.pnc.claims.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByClaimId(Long claimId);
}
