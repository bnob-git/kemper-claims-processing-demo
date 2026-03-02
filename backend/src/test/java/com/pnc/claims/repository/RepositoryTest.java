package com.pnc.claims.repository;

import com.pnc.claims.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class RepositoryTest {

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private PolicyRepository policyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AssignmentRepository assignmentRepository;

    @Autowired
    private ClaimEventRepository claimEventRepository;

    @Autowired
    private DocumentMetadataRepository documentMetadataRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    // --- ClaimRepository ---

    @Test
    void claimRepository_FindAll_ReturnsSeededClaims() {
        List<Claim> claims = claimRepository.findAll();
        assertEquals(5, claims.size());
    }

    @Test
    void claimRepository_FindById_ReturnsClaim() {
        Optional<Claim> claim = claimRepository.findById(1L);
        assertTrue(claim.isPresent());
        assertEquals("CLM-2024-0001", claim.get().getClaimNumber());
    }

    @Test
    void claimRepository_FindById_NotFound() {
        Optional<Claim> claim = claimRepository.findById(999L);
        assertFalse(claim.isPresent());
    }

    @Test
    void claimRepository_FindByClaimNumber_Found() {
        Optional<Claim> claim = claimRepository.findByClaimNumber("CLM-2024-0001");
        assertTrue(claim.isPresent());
        assertEquals(1L, claim.get().getId());
    }

    @Test
    void claimRepository_FindByClaimNumber_NotFound() {
        Optional<Claim> claim = claimRepository.findByClaimNumber("CLM-NONEXISTENT");
        assertFalse(claim.isPresent());
    }

    @Test
    void claimRepository_FindByStatus_Open() {
        List<Claim> openClaims = claimRepository.findByStatus("OPEN");
        assertFalse(openClaims.isEmpty());
        for (Claim c : openClaims) {
            assertEquals("OPEN", c.getStatus());
        }
    }

    @Test
    void claimRepository_FindByStatus_Settled() {
        List<Claim> settled = claimRepository.findByStatus("SETTLED");
        assertFalse(settled.isEmpty());
        for (Claim c : settled) {
            assertEquals("SETTLED", c.getStatus());
        }
    }

    @Test
    void claimRepository_CountByStatus() {
        long openCount = claimRepository.countByStatus("OPEN");
        assertTrue(openCount >= 1);
    }

    @Test
    void claimRepository_CountByStatus_NonExistent() {
        long count = claimRepository.countByStatus("NONEXISTENT");
        assertEquals(0, count);
    }

    // --- PolicyRepository ---

    @Test
    void policyRepository_FindAll_ReturnsSeededPolicies() {
        List<Policy> policies = policyRepository.findAll();
        assertEquals(5, policies.size());
    }

    @Test
    void policyRepository_FindById() {
        Optional<Policy> policy = policyRepository.findById(1L);
        assertTrue(policy.isPresent());
        assertEquals("POL-2024-00101", policy.get().getPolicyNumber());
        assertEquals("Alice Henderson", policy.get().getHolderName());
    }

    // --- UserRepository ---

    @Test
    void userRepository_FindAll_ReturnsSeededUsers() {
        List<AppUser> users = userRepository.findAll();
        assertEquals(3, users.size());
    }

    @Test
    void userRepository_FindByUsername_Found() {
        Optional<AppUser> user = userRepository.findByUsername("jsmith");
        assertTrue(user.isPresent());
        assertEquals("John Smith", user.get().getFullName());
        assertEquals("SENIOR_ADJUSTER", user.get().getRole());
    }

    @Test
    void userRepository_FindByUsername_NotFound() {
        Optional<AppUser> user = userRepository.findByUsername("nonexistent");
        assertFalse(user.isPresent());
    }

    @Test
    void userRepository_FindByRole_Adjuster() {
        List<AppUser> adjusters = userRepository.findByRole("ADJUSTER");
        assertFalse(adjusters.isEmpty());
        for (AppUser u : adjusters) {
            assertEquals("ADJUSTER", u.getRole());
        }
    }

    @Test
    void userRepository_FindByRole_SeniorAdjuster() {
        List<AppUser> seniors = userRepository.findByRole("SENIOR_ADJUSTER");
        assertFalse(seniors.isEmpty());
        for (AppUser u : seniors) {
            assertEquals("SENIOR_ADJUSTER", u.getRole());
        }
    }

    // --- AssignmentRepository ---

    @Test
    void assignmentRepository_FindByClaimId() {
        List<Assignment> assignments = assignmentRepository.findByClaimId(1L);
        assertFalse(assignments.isEmpty());
        for (Assignment a : assignments) {
            assertEquals(1L, a.getClaimId());
        }
    }

    @Test
    void assignmentRepository_FindByClaimId_NoAssignments() {
        // No claim with id 999 in seed data
        List<Assignment> assignments = assignmentRepository.findByClaimId(999L);
        assertTrue(assignments.isEmpty());
    }

    // --- ClaimEventRepository ---

    @Test
    void claimEventRepository_FindByClaimIdOrderByCreatedAtAsc() {
        List<ClaimEvent> events = claimEventRepository.findByClaimIdOrderByCreatedAtAsc(2L);
        assertFalse(events.isEmpty());
        // Verify ordering by checking timestamps are ascending
        for (int i = 1; i < events.size(); i++) {
            assertTrue(
                events.get(i).getCreatedAt().compareTo(events.get(i - 1).getCreatedAt()) >= 0,
                "Events should be ordered by createdAt ascending"
            );
        }
    }

    @Test
    void claimEventRepository_FindByClaimId_NoEvents() {
        List<ClaimEvent> events = claimEventRepository.findByClaimIdOrderByCreatedAtAsc(999L);
        assertTrue(events.isEmpty());
    }

    // --- DocumentMetadataRepository ---

    @Test
    void documentMetadataRepository_FindByClaimId() {
        List<DocumentMetadata> docs = documentMetadataRepository.findByClaimId(2L);
        assertFalse(docs.isEmpty());
        for (DocumentMetadata d : docs) {
            assertEquals(2L, d.getClaimId());
        }
    }

    @Test
    void documentMetadataRepository_FindByClaimId_NoDocs() {
        List<DocumentMetadata> docs = documentMetadataRepository.findByClaimId(4L);
        assertTrue(docs.isEmpty());
    }

    // --- PaymentRepository ---

    @Test
    void paymentRepository_FindByClaimId() {
        List<Payment> payments = paymentRepository.findByClaimId(4L);
        assertFalse(payments.isEmpty());
        for (Payment p : payments) {
            assertEquals(4L, p.getClaimId());
        }
    }

    @Test
    void paymentRepository_FindByClaimId_NoPayments() {
        List<Payment> payments = paymentRepository.findByClaimId(1L);
        assertTrue(payments.isEmpty());
    }
}
