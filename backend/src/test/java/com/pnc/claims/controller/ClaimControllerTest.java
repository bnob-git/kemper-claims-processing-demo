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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
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

    private Claim testClaim;

    @BeforeEach
    void setUp() {
        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("Test Holder");

        testClaim = new Claim();
        testClaim.setId(1L);
        testClaim.setClaimNumber("CLM-TEST0001");
        testClaim.setPolicy(policy);
        testClaim.setStatus("OPEN");
        testClaim.setLossType("COLLISION");
        testClaim.setSeverityScore(5);
        testClaim.setClaimantName("Test User");
        testClaim.setLossDate(LocalDate.of(2024, 1, 15));
        testClaim.setReportedDate(LocalDate.now());
    }

    @Test
    void getAllClaims_withoutStatus_returnsAll() throws Exception {
        when(claimService.getAllClaims()).thenReturn(List.of(testClaim));

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].claimNumber").value("CLM-TEST0001"));
    }

    @Test
    void getAllClaims_withStatus_filtersResults() throws Exception {
        when(claimService.getClaimsByStatus("OPEN")).thenReturn(List.of(testClaim));

        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("OPEN"));
    }

    @Test
    void getClaimById_returnsClaimDetails() throws Exception {
        when(claimService.getClaimById(1L)).thenReturn(testClaim);

        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber").value("CLM-TEST0001"));
    }

    @Test
    void createClaim_returnsCreatedClaim() throws Exception {
        when(claimService.createClaim(any())).thenReturn(testClaim);

        Map<String, Object> request = Map.of(
                "policyId", 1L,
                "lossType", "COLLISION",
                "severityScore", 5,
                "lossDate", "2024-01-15",
                "lossDescription", "Test collision",
                "claimantName", "Test User",
                "claimantPhone", "555-1234"
        );

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber").value("CLM-TEST0001"));
    }

    @Test
    void updateClaimStatus_returnsUpdatedClaim() throws Exception {
        testClaim.setStatus("UNDER_INVESTIGATION");
        when(claimService.updateClaimStatus(eq(1L), eq("UNDER_INVESTIGATION"), anyString())).thenReturn(testClaim);

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_INVESTIGATION\"}")
                        .header("X-User", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_INVESTIGATION"));
    }

    @Test
    void getClaimEvents_returnsEventList() throws Exception {
        ClaimEvent event = new ClaimEvent();
        event.setId(1L);
        event.setClaimId(1L);
        event.setEventType("STATUS_CHANGE");
        event.setNewStatus("OPEN");
        when(claimService.getClaimEvents(1L)).thenReturn(List.of(event));

        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].eventType").value("STATUS_CHANGE"));
    }

    @Test
    void getAssignments_returnsAssignmentList() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignmentType("AUTO");
        when(claimService.getClaimAssignments(1L)).thenReturn(List.of(assignment));

        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].assignmentType").value("AUTO"));
    }

    @Test
    void createAssignment_autoAssign_whenNoBody() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAssignmentType("AUTO");
        when(claimService.autoAssignClaim(1L)).thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated());
    }

    @Test
    void createAssignment_manualAssign_withAdjusterId() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAssignmentType("MANUAL");
        when(claimService.manualAssignClaim(eq(1L), eq(2L), any())).thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adjusterId\":2,\"notes\":\"Manual assignment\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType").value("MANUAL"));
    }

    @Test
    void reserveDecision_approve() throws Exception {
        testClaim.setStatus("RESERVE_SET");
        testClaim.setReserveAmount(new BigDecimal("5000.00"));
        when(claimService.setReserveDecision(eq(1L), eq("APPROVE"), any())).thenReturn(testClaim);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\",\"amount\":\"5000.00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESERVE_SET"));
    }

    @Test
    void reserveDecision_approveWithoutAmount() throws Exception {
        testClaim.setStatus("RESERVE_SET");
        when(claimService.setReserveDecision(eq(1L), eq("APPROVE"), isNull())).thenReturn(testClaim);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void getDocuments_returnsDocumentList() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("photo.jpg");
        when(claimService.getClaimDocuments(1L)).thenReturn(List.of(doc));

        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].fileName").value("photo.jpg"));
    }

    @Test
    void addDocument_returnsCreatedDocument() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("damage.pdf");
        when(claimService.addDocument(eq(1L), any())).thenReturn(doc);

        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"damage.pdf\",\"documentType\":\"PHOTO\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("damage.pdf"));
    }

    @Test
    void getPayments_returnsPaymentList() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        when(claimService.getClaimPayments(1L)).thenReturn(List.of(payment));

        mockMvc.perform(get("/api/claims/1/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].amount").value(3000.00));
    }

    @Test
    void issuePayment_returnsCreatedPayment() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setAmount(new BigDecimal("4000.00"));
        when(claimService.issuePayment(eq(1L), any())).thenReturn(payment);

        mockMvc.perform(post("/api/claims/1/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":\"4000.00\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void closeClaim_withSubrogation() throws Exception {
        testClaim.setStatus("CLOSED");
        testClaim.setSubrogationFlag(true);
        when(claimService.closeClaim(1L, true)).thenReturn(testClaim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    void closeClaim_withoutSubrogation() throws Exception {
        testClaim.setStatus("CLOSED");
        testClaim.setSubrogationFlag(false);
        when(claimService.closeClaim(1L, false)).thenReturn(testClaim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }
}
