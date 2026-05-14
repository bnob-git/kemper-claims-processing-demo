package com.pnc.claims.entity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class EntityTest {

    @Test
    void policy_gettersSetters() {
        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("John Doe");
        policy.setHolderEmail("john@example.com");
        policy.setVehicleVin("1HGCM82633A004352");
        policy.setVehicleYear(2020);
        policy.setVehicleMake("Honda");
        policy.setVehicleModel("Civic");
        policy.setCoverageType("COMPREHENSIVE");
        policy.setEffectiveDate(LocalDate.of(2024, 1, 1));
        policy.setExpirationDate(LocalDate.of(2025, 1, 1));

        assertEquals(1L, policy.getId());
        assertEquals("POL-001", policy.getPolicyNumber());
        assertEquals("John Doe", policy.getHolderName());
        assertEquals("john@example.com", policy.getHolderEmail());
        assertEquals("1HGCM82633A004352", policy.getVehicleVin());
        assertEquals(2020, policy.getVehicleYear());
        assertEquals("Honda", policy.getVehicleMake());
        assertEquals("Civic", policy.getVehicleModel());
        assertEquals("COMPREHENSIVE", policy.getCoverageType());
        assertEquals(LocalDate.of(2024, 1, 1), policy.getEffectiveDate());
        assertEquals(LocalDate.of(2025, 1, 1), policy.getExpirationDate());
    }

    @Test
    void claim_gettersSetters() {
        Claim claim = new Claim();
        claim.setId(1L);
        claim.setClaimNumber("CLM-001");
        claim.setStatus("OPEN");
        claim.setLossType("COLLISION");
        claim.setSeverityScore(7);
        claim.setLossDate(LocalDate.of(2024, 6, 15));
        claim.setLossDescription("Test description");
        claim.setReportedDate(LocalDate.now());
        claim.setClaimantName("Jane Doe");
        claim.setClaimantPhone("555-1234");
        claim.setReserveAmount(new BigDecimal("5000.00"));
        claim.setSettlementAmount(new BigDecimal("4500.00"));
        claim.setSubrogationFlag(true);
        claim.setCreatedAt(LocalDateTime.now());
        claim.setUpdatedAt(LocalDateTime.now());

        assertEquals(1L, claim.getId());
        assertEquals("CLM-001", claim.getClaimNumber());
        assertEquals("OPEN", claim.getStatus());
        assertEquals("COLLISION", claim.getLossType());
        assertEquals(7, claim.getSeverityScore());
        assertEquals("Test description", claim.getLossDescription());
        assertEquals("Jane Doe", claim.getClaimantName());
        assertEquals("555-1234", claim.getClaimantPhone());
        assertEquals(new BigDecimal("5000.00"), claim.getReserveAmount());
        assertEquals(new BigDecimal("4500.00"), claim.getSettlementAmount());
        assertTrue(claim.getSubrogationFlag());
        assertNotNull(claim.getCreatedAt());
        assertNotNull(claim.getUpdatedAt());
    }

    @Test
    void claim_prePersist_setsTimestamps() {
        Claim claim = new Claim();
        claim.prePersist();
        assertNotNull(claim.getCreatedAt());
        assertNotNull(claim.getUpdatedAt());
    }

    @Test
    void claim_preUpdate_setsUpdatedAt() {
        Claim claim = new Claim();
        claim.preUpdate();
        assertNotNull(claim.getUpdatedAt());
    }

    @Test
    void claimEvent_gettersSetters() {
        ClaimEvent event = new ClaimEvent();
        event.setId(1L);
        event.setClaimId(1L);
        event.setEventType("STATUS_CHANGE");
        event.setOldStatus("OPEN");
        event.setNewStatus("UNDER_INVESTIGATION");
        event.setNotes("Status changed");
        event.setCreatedBy("admin");
        event.setCreatedAt(LocalDateTime.now());

        assertEquals(1L, event.getId());
        assertEquals(1L, event.getClaimId());
        assertEquals("STATUS_CHANGE", event.getEventType());
        assertEquals("OPEN", event.getOldStatus());
        assertEquals("UNDER_INVESTIGATION", event.getNewStatus());
        assertEquals("Status changed", event.getNotes());
        assertEquals("admin", event.getCreatedBy());
        assertNotNull(event.getCreatedAt());
    }

    @Test
    void claimEvent_prePersist_setsCreatedAt() {
        ClaimEvent event = new ClaimEvent();
        event.prePersist();
        assertNotNull(event.getCreatedAt());
    }

    @Test
    void claimEvent_prePersist_doesNotOverwrite() {
        ClaimEvent event = new ClaimEvent();
        LocalDateTime fixed = LocalDateTime.of(2024, 1, 1, 0, 0);
        event.setCreatedAt(fixed);
        event.prePersist();
        assertEquals(fixed, event.getCreatedAt());
    }

    @Test
    void assignment_gettersSetters() {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignedDate(LocalDate.now());
        assignment.setAssignmentType("AUTO");
        assignment.setNotes("Auto assigned");

        AppUser adjuster = new AppUser();
        adjuster.setId(2L);
        assignment.setAdjuster(adjuster);

        assertEquals(1L, assignment.getId());
        assertEquals(1L, assignment.getClaimId());
        assertEquals(2L, assignment.getAdjusterId());
        assertEquals("AUTO", assignment.getAssignmentType());
        assertEquals("Auto assigned", assignment.getNotes());
        assertNotNull(assignment.getAdjuster());
    }

    @Test
    void payment_gettersSetters() {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setPaymentType("SETTLEMENT");
        payment.setPaymentDate(LocalDate.now());
        payment.setReferenceNumber("PAY-12345678");
        payment.setStatus("COMPLETED");
        payment.setCreatedBy("system");

        assertEquals(1L, payment.getId());
        assertEquals(1L, payment.getClaimId());
        assertEquals(new BigDecimal("3000.00"), payment.getAmount());
        assertEquals("SETTLEMENT", payment.getPaymentType());
        assertEquals("PAY-12345678", payment.getReferenceNumber());
        assertEquals("COMPLETED", payment.getStatus());
        assertEquals("system", payment.getCreatedBy());
    }

    @Test
    void documentMetadata_gettersSetters() {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("photo.jpg");
        doc.setDocumentType("PHOTO");
        doc.setUploadedBy("admin");
        doc.setUploadedAt(LocalDateTime.now());
        doc.setNotes("Front damage");

        assertEquals(1L, doc.getId());
        assertEquals(1L, doc.getClaimId());
        assertEquals("photo.jpg", doc.getFileName());
        assertEquals("PHOTO", doc.getDocumentType());
        assertEquals("admin", doc.getUploadedBy());
        assertNotNull(doc.getUploadedAt());
        assertEquals("Front damage", doc.getNotes());
    }

    @Test
    void documentMetadata_prePersist_setsUploadedAt() {
        DocumentMetadata doc = new DocumentMetadata();
        doc.prePersist();
        assertNotNull(doc.getUploadedAt());
    }

    @Test
    void documentMetadata_prePersist_doesNotOverwrite() {
        DocumentMetadata doc = new DocumentMetadata();
        LocalDateTime fixed = LocalDateTime.of(2024, 1, 1, 0, 0);
        doc.setUploadedAt(fixed);
        doc.prePersist();
        assertEquals(fixed, doc.getUploadedAt());
    }

    @Test
    void appUser_gettersSetters() {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setUsername("adjuster1");
        user.setFullName("John Smith");
        user.setRole("ADJUSTER");
        user.setEmail("john@example.com");

        assertEquals(1L, user.getId());
        assertEquals("adjuster1", user.getUsername());
        assertEquals("John Smith", user.getFullName());
        assertEquals("ADJUSTER", user.getRole());
        assertEquals("john@example.com", user.getEmail());
    }
}
