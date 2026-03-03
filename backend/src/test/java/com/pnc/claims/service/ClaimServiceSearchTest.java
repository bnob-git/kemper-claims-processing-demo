package com.pnc.claims.service;

import com.pnc.claims.entity.Claim;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class ClaimServiceSearchTest {

    @Autowired
    private ClaimService claimService;

    @Test
    void searchClaims_byStatus_shouldFilterCorrectly() {
        List<Claim> results = claimService.searchClaims(
                "OPEN", null, null, null, null);
        assertFalse(results.isEmpty());
        results.forEach(c -> assertEquals("OPEN", c.getStatus()));
    }

    @Test
    void searchClaims_byTextSearch_claimNumber() {
        List<Claim> results = claimService.searchClaims(
                null, "CLM-2024-0001", null, null, null);
        assertEquals(1, results.size());
        assertEquals("CLM-2024-0001", results.get(0).getClaimNumber());
    }

    @Test
    void searchClaims_byTextSearch_claimantName() {
        List<Claim> results = claimService.searchClaims(
                null, "alice", null, null, null);
        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(
                c -> c.getClaimantName().toLowerCase()
                        .contains("alice")));
    }

    @Test
    void searchClaims_byTextSearch_policyNumber() {
        List<Claim> results = claimService.searchClaims(
                null, "POL-2024-00101", null, null, null);
        assertFalse(results.isEmpty());
    }

    @Test
    void searchClaims_byLossType_single() {
        List<Claim> results = claimService.searchClaims(
                null, null, List.of("THEFT"), null, null);
        assertFalse(results.isEmpty());
        results.forEach(c -> assertEquals("THEFT", c.getLossType()));
    }

    @Test
    void searchClaims_byLossType_multiple() {
        List<Claim> results = claimService.searchClaims(
                null, null,
                List.of("COLLISION", "WEATHER"), null, null);
        assertFalse(results.isEmpty());
        results.forEach(c -> assertTrue(
                "COLLISION".equals(c.getLossType())
                        || "WEATHER".equals(c.getLossType())));
    }

    @Test
    void searchClaims_byDateRange() {
        List<Claim> results = claimService.searchClaims(
                null, null, null,
                LocalDate.of(2024, 9, 10),
                LocalDate.of(2024, 9,15));
        assertFalse(results.isEmpty());
        results.forEach(c -> {
            assertTrue(!c.getLossDate()
                    .isBefore(LocalDate.of(2024, 9, 10)));
            assertTrue(!c.getLossDate()
                    .isAfter(LocalDate.of(2024, 9, 15)));
        });
    }

    @Test
    void searchClaims_combinedFilters() {
        List<Claim> results = claimService.searchClaims(
                "OPEN", "alice", List.of("COLLISION"),
                LocalDate.of(2024, 9, 1),
                LocalDate.of(2024, 9, 30));
        assertFalse(results.isEmpty());
        results.forEach(c -> {
            assertEquals("OPEN", c.getStatus());
            assertEquals("COLLISION", c.getLossType());
        });
    }

    @Test
    void searchClaims_noResults() {
        List<Claim> results = claimService.searchClaims(
                null, "nonexistent_xyz", null, null, null);
        assertTrue(results.isEmpty());
    }

    @Test
    void searchClaims_allNullFilters_returnsAll() {
        List<Claim> results = claimService.searchClaims(
                null, null, null, null, null);
        assertFalse(results.isEmpty());
    }
}
