package com.pnc.claims.service;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClaimServiceEdgeCaseTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private PolicyRepository policyRepository;

    @Mock
    private ClaimEventRepository claimEventRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private DocumentMetadataRepository documentMetadataRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ClaimService claimService;

    private Claim sampleClaim;
    private Policy samplePolicy;
    private AppUser sampleAdjuster;

    @BeforeEach
    void setUp() {
        samplePolicy = new Policy();
        samplePolicy.setId(1L);
        samplePolicy.setPolicyNumber("POL-001");
        samplePolicy.setHolderName("Alice Johnson");

        sampleClaim = new Claim();
        sampleClaim.setId(1L);
        sampleClaim.setClaimNumber("CLM-TEST0001");
        sampleClaim.setPolicy(samplePolicy);
        sampleClaim.setStatus("OPEN");
        sampleClaim.setLossType("COLLISION");
        sampleClaim.setSeverityScore(5);
        sampleClaim.setLossDate(LocalDate.of(2024, 9, 10));
        sampleClaim.setClaimantName("Alice");
        sampleClaim.setSubrogationFlag(false);

        sampleAdjuster = new AppUser();
        sampleAdjuster.setId(1L);
        sampleAdjuster.setUsername("jsmith");
        sampleAdjuster.setFullName("John Smith");
        sampleAdjuster.setRole("ADJUSTER");
    }

    // --- getClaimById edge cases ---

    @Test
    void getClaimById_notFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.getClaimById(999L));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    // --- createClaim edge cases ---

    @Test
    void createClaim_policyNotFound_throwsRuntimeException() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 999L);

        when(policyRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.createClaim(request));
        assertTrue(ex.getMessage().contains("Policy not found: 999"));
    }

    @Test
    void createClaim_generatesClaimNumber_andSetsStatusOpen() {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-09-10");
        request.put("lossDescription", "Test claim");
        request.put("claimantName", "Alice");
        request.put("claimantPhone", "555-0001");

        when(policyRepository.findById(1L)).thenReturn(Optional.of(samplePolicy));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> {
            Claim c = invocation.getArgument(0);
            c.setId(10L);
            return c;
        });
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Claim result = claimService.createClaim(request);

        assertNotNull(result.getClaimNumber());
        assertTrue(result.getClaimNumber().startsWith("CLM-"));
        assertEquals("OPEN", result.getStatus());
        assertFalse(result.getSubrogationFlag());
        assertEquals("COLLISION", result.getLossType());
        assertEquals(5, result.getSeverityScore());
        verify(claimEventRepository).save(any(ClaimEvent.class));
    }

    // --- updateClaimStatus edge cases ---

    @Test
    void updateClaimStatus_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.updateClaimStatus(999L, "CLOSED", "admin"));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void updateClaimStatus_createsEvent_withCorrectOldAndNewStatus() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Claim result = claimService.updateClaimStatus(1L, "UNDER_INVESTIGATION", "adjuster1");

        assertEquals("UNDER_INVESTIGATION", result.getStatus());
        verify(claimEventRepository).save(argThat(event ->
                "STATUS_CHANGE".equals(event.getEventType()) &&
                "OPEN".equals(event.getOldStatus()) &&
                "UNDER_INVESTIGATION".equals(event.getNewStatus()) &&
                "adjuster1".equals(event.getCreatedBy())
        ));
    }

    // --- autoAssignClaim edge cases ---

    @Test
    void autoAssignClaim_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.autoAssignClaim(999L));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void autoAssignClaim_collisionHighSeverity_assignsSeniorAdjuster() {
        sampleClaim.setLossType("COLLISION");
        sampleClaim.setSeverityScore(8);

        AppUser seniorAdjuster = new AppUser();
        seniorAdjuster.setId(2L);
        seniorAdjuster.setFullName("Senior Smith");
        seniorAdjuster.setRole("SENIOR_ADJUSTER");

        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(userRepository.findByRole("SENIOR_ADJUSTER")).thenReturn(List.of(seniorAdjuster));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(1L);
            return a;
        });

        Assignment result = claimService.autoAssignClaim(1L);

        assertEquals("AUTO", result.getAssignmentType());
        assertEquals(2L, result.getAdjusterId());
    }

    @Test
    void autoAssignClaim_lowSeverityCollision_assignsRegularAdjuster() {
        sampleClaim.setLossType("COLLISION");
        sampleClaim.setSeverityScore(3);

        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(userRepository.findByRole("ADJUSTER")).thenReturn(List.of(sampleAdjuster));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(1L);
            return a;
        });

        Assignment result = claimService.autoAssignClaim(1L);

        assertEquals("AUTO", result.getAssignmentType());
        assertEquals(1L, result.getAdjusterId());
    }

    @Test
    void autoAssignClaim_noSeniorCandidates_fallsBackToAdjuster() {
        sampleClaim.setLossType("COLLISION");
        sampleClaim.setSeverityScore(9);

        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(userRepository.findByRole("SENIOR_ADJUSTER")).thenReturn(Collections.emptyList());
        when(userRepository.findByRole("ADJUSTER")).thenReturn(List.of(sampleAdjuster));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(1L);
            return a;
        });

        Assignment result = claimService.autoAssignClaim(1L);

        assertEquals(1L, result.getAdjusterId());
        verify(userRepository).findByRole("SENIOR_ADJUSTER");
        verify(userRepository).findByRole("ADJUSTER");
    }

    // --- manualAssignClaim edge cases ---

    @Test
    void manualAssignClaim_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(999L, 1L, "notes"));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void manualAssignClaim_adjusterNotFound_throwsRuntimeException() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.manualAssignClaim(1L, 999L, "notes"));
        assertTrue(ex.getMessage().contains("User not found: 999"));
    }

    @Test
    void manualAssignClaim_nullNotes_usesDefaultMessage() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleAdjuster));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(1L);
            return a;
        });

        Assignment result = claimService.manualAssignClaim(1L, 1L, null);

        assertEquals("MANUAL", result.getAssignmentType());
        assertTrue(result.getNotes().contains("Manually assigned to"));
    }

    @Test
    void manualAssignClaim_withNotes_usesProvidedNotes() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleAdjuster));
        when(assignmentRepository.save(any(Assignment.class))).thenAnswer(invocation -> {
            Assignment a = invocation.getArgument(0);
            a.setId(1L);
            return a;
        });

        Assignment result = claimService.manualAssignClaim(1L, 1L, "Special case");

        assertEquals("Special case", result.getNotes());
    }

    // --- setReserveDecision edge cases ---

    @Test
    void setReserveDecision_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.setReserveDecision(999L, "APPROVE", BigDecimal.TEN));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void setReserveDecision_approve_withExplicitAmount_setsReserve() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Claim result = claimService.setReserveDecision(1L, "APPROVE", new BigDecimal("7500.00"));

        assertEquals("RESERVE_SET", result.getStatus());
        assertEquals(new BigDecimal("7500.00"), result.getReserveAmount());
    }

    @Test
    void setReserveDecision_deny_setsStatusDenied() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Claim result = claimService.setReserveDecision(1L, "DENY", null);

        assertEquals("DENIED", result.getStatus());
        assertNull(result.getReserveAmount());
    }

    // --- addDocument edge cases ---

    @Test
    void addDocument_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.addDocument(999L, Map.of("fileName", "test.pdf")));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void addDocument_validRequest_savesDocument() {
        Map<String, String> request = new HashMap<>();
        request.put("fileName", "report.pdf");
        request.put("documentType", "POLICE_REPORT");
        request.put("uploadedBy", "admin");
        request.put("notes", "Initial report");

        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(documentMetadataRepository.save(any(DocumentMetadata.class))).thenAnswer(invocation -> {
            DocumentMetadata d = invocation.getArgument(0);
            d.setId(1L);
            return d;
        });

        DocumentMetadata result = claimService.addDocument(1L, request);

        assertEquals("report.pdf", result.getFileName());
        assertEquals("POLICE_REPORT", result.getDocumentType());
        assertEquals(1L, result.getClaimId());
    }

    // --- issuePayment edge cases ---

    @Test
    void issuePayment_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.issuePayment(999L, Map.of("amount", "1000.00")));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void issuePayment_setsClaimStatusToSettled() {
        Map<String, Object> request = new HashMap<>();
        request.put("amount", "5000.00");
        request.put("createdBy", "adjuster1");

        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });

        Payment result = claimService.issuePayment(1L, request);

        assertEquals(new BigDecimal("5000.00"), result.getAmount());
        assertEquals("SETTLEMENT", result.getPaymentType());
        assertEquals("COMPLETED", result.getStatus());
        assertEquals("adjuster1", result.getCreatedBy());
        assertNotNull(result.getReferenceNumber());
        assertTrue(result.getReferenceNumber().startsWith("PAY-"));

        assertEquals("SETTLED", sampleClaim.getStatus());
        assertEquals(new BigDecimal("5000.00"), sampleClaim.getSettlementAmount());
    }

    @Test
    void issuePayment_noCreatedBy_defaultsToSystem() {
        Map<String, Object> request = new HashMap<>();
        request.put("amount", "1000.00");

        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
            Payment p = invocation.getArgument(0);
            p.setId(1L);
            return p;
        });

        Payment result = claimService.issuePayment(1L, request);

        assertEquals("system", result.getCreatedBy());
    }

    // --- closeClaim edge cases ---

    @Test
    void closeClaim_claimNotFound_throwsRuntimeException() {
        when(claimRepository.findById(999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> claimService.closeClaim(999L, false));
        assertTrue(ex.getMessage().contains("Claim not found: 999"));
    }

    @Test
    void closeClaim_withSubrogation_setsFlag() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Claim result = claimService.closeClaim(1L, true);

        assertEquals("CLOSED", result.getStatus());
        assertTrue(result.getSubrogationFlag());
        verify(claimEventRepository).save(argThat(event ->
                event.getNotes().contains("with subrogation")
        ));
    }

    @Test
    void closeClaim_withoutSubrogation_flagIsFalse() {
        when(claimRepository.findById(1L)).thenReturn(Optional.of(sampleClaim));
        when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(claimEventRepository.save(any(ClaimEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Claim result = claimService.closeClaim(1L, false);

        assertEquals("CLOSED", result.getStatus());
        assertFalse(result.getSubrogationFlag());
        verify(claimEventRepository).save(argThat(event ->
                !event.getNotes().contains("with subrogation")
        ));
    }

    // --- getClaimEvents / getClaimAssignments / getClaimDocuments / getClaimPayments ---

    @Test
    void getClaimEvents_delegatesToRepository() {
        ClaimEvent event = new ClaimEvent();
        event.setId(1L);
        event.setClaimId(1L);
        when(claimEventRepository.findByClaimIdOrderByCreatedAtAsc(1L)).thenReturn(List.of(event));

        List<ClaimEvent> result = claimService.getClaimEvents(1L);

        assertEquals(1, result.size());
        verify(claimEventRepository).findByClaimIdOrderByCreatedAtAsc(1L);
    }

    @Test
    void getClaimAssignments_delegatesToRepository() {
        when(assignmentRepository.findByClaimId(1L)).thenReturn(Collections.emptyList());

        List<Assignment> result = claimService.getClaimAssignments(1L);

        assertTrue(result.isEmpty());
        verify(assignmentRepository).findByClaimId(1L);
    }

    @Test
    void getClaimDocuments_delegatesToRepository() {
        when(documentMetadataRepository.findByClaimId(1L)).thenReturn(Collections.emptyList());

        List<DocumentMetadata> result = claimService.getClaimDocuments(1L);

        assertTrue(result.isEmpty());
        verify(documentMetadataRepository).findByClaimId(1L);
    }

    @Test
    void getClaimPayments_delegatesToRepository() {
        when(paymentRepository.findByClaimId(1L)).thenReturn(Collections.emptyList());

        List<Payment> result = claimService.getClaimPayments(1L);

        assertTrue(result.isEmpty());
        verify(paymentRepository).findByClaimId(1L);
    }

    @Test
    void getAllClaims_delegatesToRepository() {
        when(claimRepository.findAll()).thenReturn(List.of(sampleClaim));

        List<Claim> result = claimService.getAllClaims();

        assertEquals(1, result.size());
        verify(claimRepository).findAll();
    }

    @Test
    void getClaimsByStatus_delegatesToRepository() {
        when(claimRepository.findByStatus("OPEN")).thenReturn(List.of(sampleClaim));

        List<Claim> result = claimService.getClaimsByStatus("OPEN");

        assertEquals(1, result.size());
        verify(claimRepository).findByStatus("OPEN");
    }
}
