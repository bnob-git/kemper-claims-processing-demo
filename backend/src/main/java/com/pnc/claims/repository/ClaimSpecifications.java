package com.pnc.claims.repository;

import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.Policy;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class ClaimSpecifications {

    private ClaimSpecifications() {
    }

    public static Specification<Claim> withFilters(
            String status,
            String search,
            List<String> lossTypes,
            LocalDate lossDateFrom,
            LocalDate lossDateTo) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                Join<Claim, Policy> policyJoin = root.join("policy");
                Predicate claimNumberMatch = cb.like(
                        cb.lower(root.get("claimNumber")), pattern);
                Predicate claimantNameMatch = cb.like(
                        cb.lower(root.get("claimantName")), pattern);
                Predicate policyNumberMatch = cb.like(
                        cb.lower(policyJoin.get("policyNumber")), pattern);
                predicates.add(cb.or(
                        claimNumberMatch, claimantNameMatch, policyNumberMatch));
            }

            if (lossTypes != null && !lossTypes.isEmpty()) {
                predicates.add(root.get("lossType").in(lossTypes));
            }

            if (lossDateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                        root.get("lossDate"), lossDateFrom));
            }

            if (lossDateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(
                        root.get("lossDate"), lossDateTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
