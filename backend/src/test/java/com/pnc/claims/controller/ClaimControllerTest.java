package com.pnc.claims.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pnc.claims.entity.*;
import com.pnc.claims.service.ClaimService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClaimController.class)
class ClaimControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClaimService claimService;

    @Autowired
    private ObjectMapper objectMapper;

    private Claim sampleClaim;
    private Policy samplePolicy;

    @BeforeEach
    void setUp() {
        samplePolicy = new Policy();
        samplePolicy.setId(1L);
        samplePolicy.setPolicyNumber("POL-001");
        samplePolicy.setHolderName("Alice Johnson");

        sampleClaim = new Claim();
        sampleClaim.setId(1L);
        sampleClaim.setClaimNumber("CLM-ABCD1234");
        sampleClaim.setPolicy(samplePolicy);
        sampleClaim.setStatus("OPEN");
        sampleClaim.setLossType("COLLISION");
        sampleClaim.setSeverityScore(7);
        sampleClaim.setLossDate(LocalDate.of(2024, 9, 10));
        sampleClaim.setReportedDate(LocalDate.of(2024, 9, 10));
        sampleClaim.setClaimantName("Alice Johnson");
        sampleClaim.setClaimantPhone("555-0101");
        sampleClaim.setSubrogationFlag(false);
    }

    // --- GET /api/claims ---

    @Test
    void getAllClaims_returnsListOfClaims() throws Exception {
        when(claimService.getAllClaims()).thenReturn(List.of(sampleClaim));

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].claimNumber").value("CLM-ABCD1234"))
                .andExpect(jsonPath("$[0].status").value("OPEN"));

        verify(claimService).getAllClaims();
    }

    @Test
    void getAllClaims_withStatusFilter_callsGetClaimsByStatus() throws Exception {
        when(claimService.getClaimsByStatus("OPEN")).thenReturn(List.of(sampleClaim));

        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        verify(claimService).getClaimsByStatus("OPEN");
        verify(claimService, never()).getAllClaims();
    }

    @Test
    void getAllClaims_withBlankStatus_callsGetAllClaims() throws Exception {
        when(claimService.getAllClaims()).thenReturn(List.of(sampleClaim));

        mockMvc.perform(get("/api/claims").param("status", "  "))
                .andExpect(status().isOk());

        verify(claimService).getAllClaims();
    }

    @Test
    void getAllClaims_emptyList_returnsEmptyArray() throws Exception {
        when(claimService.getAllClaims()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // --- GET /api/claims/{id} ---

    @Test
    void getClaimById_existingClaim_returnsClaim() throws Exception {
        when(claimService.getClaimById(1L)).thenReturn(sampleClaim);

        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber").value("CLM-ABCD1234"))
                .andExpect(jsonPath("$.lossType").value("COLLISION"))
                .andExpect(jsonPath("$.severityScore").value(7));
    }

    @Test
    void getClaimById_notFound_throwsException() {
        when(claimService.getClaimById(999L)).thenThrow(new RuntimeException("Claim not found: 999"));

        assertThrows(Exception.class, () ->
                mockMvc.perform(get("/api/claims/999")));
    }

    // --- POST /api/claims ---

    @Test
    void createClaim_validRequest_returnsCreated() throws Exception {
        when(claimService.createClaim(any())).thenReturn(sampleClaim);

        Map<String, Object> request = Map.of(
                "policyId", 1,
                "lossType", "COLLISION",
                "severityScore", 7,
                "lossDate", "2024-09-10",
                "lossDescription", "Rear-end collision",
                "claimantName", "Alice Johnson",
                "claimantPhone", "555-0101"
        );

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber").value("CLM-ABCD1234"))
                .andExpect(jsonPath("$.status").value("OPEN"));

        verify(claimService).createClaim(any());
    }

    // --- PATCH /api/claims/{id}/status ---

    @Test
    void updateClaimStatus_validRequest_returnsUpdatedClaim() throws Exception {
        Claim updatedClaim = new Claim();
        updatedClaim.setId(1L);
        updatedClaim.setClaimNumber("CLM-ABCD1234");
        updatedClaim.setStatus("UNDER_INVESTIGATION");
        updatedClaim.setPolicy(samplePolicy);
        updatedClaim.setLossType("COLLISION");
        updatedClaim.setSeverityScore(7);

        when(claimService.updateClaimStatus(eq(1L), eq("UNDER_INVESTIGATION"), eq("adjuster1")))
                .thenReturn(updatedClaim);

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User", "adjuster1")
                        .content("{\"status\":\"UNDER_INVESTIGATION\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_INVESTIGATION"));
    }

    @Test
    void updateClaimStatus_noUserHeader_defaultsToSystem() throws Exception {
        sampleClaim.setStatus("UNDER_INVESTIGATION");
        when(claimService.updateClaimStatus(eq(1L), eq("UNDER_INVESTIGATION"), eq("system")))
                .thenReturn(sampleClaim);

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_INVESTIGATION\"}"))
                .andExpect(status().isOk());

        verify(claimService).updateClaimStatus(1L, "UNDER_INVESTIGATION", "system");
    }

    // --- GET /api/claims/{id}/events ---

    @Test
    void getClaimEvents_returnsEventsList() throws Exception {
        ClaimEvent event = new ClaimEvent();
        event.setId(1L);
        event.setClaimId(1L);
        event.setEventType("STATUS_CHANGE");
        event.setNewStatus("OPEN");
        event.setNotes("FNOL submitted");
        event.setCreatedBy("system");

        when(claimService.getClaimEvents(1L)).thenReturn(List.of(event));

        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].eventType").value("STATUS_CHANGE"));
    }

    // --- GET /api/claims/{id}/assignments ---

    @Test
    void getAssignments_returnsAssignmentsList() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignmentType("AUTO");
        assignment.setAssignedDate(LocalDate.now());

        when(claimService.getClaimAssignments(1L)).thenReturn(List.of(assignment));

        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].assignmentType").value("AUTO"));
    }

    // --- POST /api/claims/{id}/assignments ---

    @Test
    void createAssignment_autoAssign_noBody() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignmentType("AUTO");

        when(claimService.autoAssignClaim(1L)).thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType").value("AUTO"));

        verify(claimService).autoAssignClaim(1L);
    }

    @Test
    void createAssignment_manualAssign_withAdjusterId() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(3L);
        assignment.setAssignmentType("MANUAL");
        assignment.setNotes("Specialist needed");

        when(claimService.manualAssignClaim(eq(1L), eq(3L), eq("Specialist needed")))
                .thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adjusterId\":3,\"notes\":\"Specialist needed\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType").value("MANUAL"));

        verify(claimService).manualAssignClaim(1L, 3L, "Specialist needed");
    }

    // --- POST /api/claims/{id}/reserve-decision ---

    @Test
    void reserveDecision_approveWithAmount_returnsUpdatedClaim() throws Exception {
        sampleClaim.setStatus("RESERVE_SET");
        sampleClaim.setReserveAmount(new BigDecimal("5000.00"));

        when(claimService.setReserveDecision(eq(1L), eq("APPROVE"), eq(new BigDecimal("5000"))))
                .thenReturn(sampleClaim);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\",\"amount\":5000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESERVE_SET"))
                .andExpect(jsonPath("$.reserveAmount").value(5000.00));
    }

    @Test
    void reserveDecision_deny_returnsUpdatedClaim() throws Exception {
        sampleClaim.setStatus("DENIED");

        when(claimService.setReserveDecision(eq(1L), eq("DENY"), isNull()))
                .thenReturn(sampleClaim);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"DENY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DENIED"));
    }

    // --- GET /api/claims/{id}/documents ---

    @Test
    void getDocuments_returnsDocumentsList() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("police_report.pdf");
        doc.setDocumentType("POLICE_REPORT");

        when(claimService.getClaimDocuments(1L)).thenReturn(List.of(doc));

        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fileName").value("police_report.pdf"));
    }

    // --- POST /api/claims/{id}/documents ---

    @Test
    void addDocument_validRequest_returnsCreated() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("damage_photo.jpg");
        doc.setDocumentType("PHOTO");
        doc.setUploadedBy("adjuster1");

        when(claimService.addDocument(eq(1L), any())).thenReturn(doc);

        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"damage_photo.jpg\",\"documentType\":\"PHOTO\",\"uploadedBy\":\"adjuster1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("damage_photo.jpg"));
    }

    // --- GET /api/claims/{id}/payments ---

    @Test
    void getPayments_returnsPaymentsList() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setStatus("COMPLETED");
        payment.setReferenceNumber("PAY-12345678");

        when(claimService.getClaimPayments(1L)).thenReturn(List.of(payment));

        mockMvc.perform(get("/api/claims/1/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].amount").value(3000.00));
    }

    // --- POST /api/claims/{id}/payments ---

    @Test
    void issuePayment_validRequest_returnsCreated() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setStatus("COMPLETED");
        payment.setPaymentType("SETTLEMENT");

        when(claimService.issuePayment(eq(1L), any())).thenReturn(payment);

        mockMvc.perform(post("/api/claims/1/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":\"3000.00\",\"createdBy\":\"adjuster1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(3000.00))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    // --- POST /api/claims/{id}/close ---

    @Test
    void closeClaim_withSubrogation_returnsClosedClaim() throws Exception {
        sampleClaim.setStatus("CLOSED");
        sampleClaim.setSubrogationFlag(true);

        when(claimService.closeClaim(1L, true)).thenReturn(sampleClaim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.subrogationFlag").value(true));
    }

    @Test
    void closeClaim_withoutSubrogation_returnsClosedClaim() throws Exception {
        sampleClaim.setStatus("CLOSED");
        sampleClaim.setSubrogationFlag(false);

        when(claimService.closeClaim(1L, false)).thenReturn(sampleClaim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.subrogationFlag").value(false));
    }

    @Test
    void closeClaim_noBody_defaultsSubrogationToFalse() throws Exception {
        sampleClaim.setStatus("CLOSED");
        sampleClaim.setSubrogationFlag(false);

        when(claimService.closeClaim(1L, false)).thenReturn(sampleClaim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subrogationFlag").value(false));
    }
}
