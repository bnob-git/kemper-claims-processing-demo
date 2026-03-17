package com.pnc.claims.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pnc.claims.entity.*;
import com.pnc.claims.service.ClaimService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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

    private Claim createMockClaim() {
        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("Alice Smith");

        Claim claim = new Claim();
        claim.setId(1L);
        claim.setClaimNumber("CLM-TEST0001");
        claim.setPolicy(policy);
        claim.setStatus("OPEN");
        claim.setLossType("COLLISION");
        claim.setSeverityScore(5);
        claim.setLossDate(LocalDate.of(2024, 10, 1));
        claim.setLossDescription("Test collision");
        claim.setReportedDate(LocalDate.of(2024, 10, 1));
        claim.setClaimantName("Test User");
        claim.setClaimantPhone("555-0001");
        claim.setSubrogationFlag(false);
        return claim;
    }

    @Test
    void getAllClaims_returnsAllClaims() throws Exception {
        Claim claim = createMockClaim();
        when(claimService.getAllClaims()).thenReturn(List.of(claim));

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].claimNumber", is("CLM-TEST0001")))
                .andExpect(jsonPath("$[0].status", is("OPEN")));

        verify(claimService).getAllClaims();
    }

    @Test
    void getAllClaims_filtersByStatus() throws Exception {
        Claim claim = createMockClaim();
        when(claimService.getClaimsByStatus("OPEN")).thenReturn(List.of(claim));

        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status", is("OPEN")));

        verify(claimService).getClaimsByStatus("OPEN");
    }

    @Test
    void getClaimById_returnsClaim() throws Exception {
        Claim claim = createMockClaim();
        when(claimService.getClaimById(1L)).thenReturn(claim);

        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber", is("CLM-TEST0001")))
                .andExpect(jsonPath("$.lossType", is("COLLISION")));

        verify(claimService).getClaimById(1L);
    }

    @Test
    void createClaim_returns201() throws Exception {
        Claim claim = createMockClaim();
        when(claimService.createClaim(any())).thenReturn(claim);

        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test collision");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-0001");

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber", is("CLM-TEST0001")))
                .andExpect(jsonPath("$.status", is("OPEN")));

        verify(claimService).createClaim(any());
    }

    @Test
    void updateClaimStatus_updatesStatus() throws Exception {
        Claim claim = createMockClaim();
        claim.setStatus("UNDER_INVESTIGATION");
        when(claimService.updateClaimStatus(eq(1L), eq("UNDER_INVESTIGATION"), eq("admin")))
                .thenReturn(claim);

        Map<String, String> request = Map.of("status", "UNDER_INVESTIGATION");

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-User", "admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));

        verify(claimService).updateClaimStatus(1L, "UNDER_INVESTIGATION", "admin");
    }

    @Test
    void getClaimEvents_returnsEvents() throws Exception {
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
                .andExpect(jsonPath("$[0].eventType", is("STATUS_CHANGE")));

        verify(claimService).getClaimEvents(1L);
    }

    @Test
    void getAssignments_returnsAssignments() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(1L);
        assignment.setAssignedDate(LocalDate.now());
        assignment.setAssignmentType("AUTO");
        assignment.setNotes("Auto-assigned");

        when(claimService.getClaimAssignments(1L)).thenReturn(List.of(assignment));

        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].assignmentType", is("AUTO")));

        verify(claimService).getClaimAssignments(1L);
    }

    @Test
    void createAssignment_autoAssign() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(1L);
        assignment.setAssignedDate(LocalDate.now());
        assignment.setAssignmentType("AUTO");

        when(claimService.autoAssignClaim(1L)).thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("AUTO")));

        verify(claimService).autoAssignClaim(1L);
    }

    @Test
    void createAssignment_manualAssign() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignedDate(LocalDate.now());
        assignment.setAssignmentType("MANUAL");
        assignment.setNotes("Manual override");

        when(claimService.manualAssignClaim(eq(1L), eq(2L), eq("Manual override")))
                .thenReturn(assignment);

        Map<String, Object> request = new HashMap<>();
        request.put("adjusterId", 2);
        request.put("notes", "Manual override");

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("MANUAL")));

        verify(claimService).manualAssignClaim(1L, 2L, "Manual override");
    }

    @Test
    void reserveDecision_approvesReserve() throws Exception {
        Claim claim = createMockClaim();
        claim.setStatus("RESERVE_SET");
        claim.setReserveAmount(new BigDecimal("5000.00"));

        when(claimService.setReserveDecision(eq(1L), eq("APPROVE"), any(BigDecimal.class)))
                .thenReturn(claim);

        Map<String, Object> request = new HashMap<>();
        request.put("decision", "APPROVE");
        request.put("amount", 5000.00);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")));

        verify(claimService).setReserveDecision(eq(1L), eq("APPROVE"), any(BigDecimal.class));
    }

    @Test
    void getDocuments_returnsDocuments() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("report.pdf");
        doc.setDocumentType("POLICE_REPORT");
        doc.setUploadedBy("admin");

        when(claimService.getClaimDocuments(1L)).thenReturn(List.of(doc));

        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fileName", is("report.pdf")));

        verify(claimService).getClaimDocuments(1L);
    }

    @Test
    void addDocument_returns201() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("photo.jpg");
        doc.setDocumentType("PHOTO");
        doc.setUploadedBy("admin");

        when(claimService.addDocument(eq(1L), any())).thenReturn(doc);

        Map<String, String> request = new HashMap<>();
        request.put("fileName", "photo.jpg");
        request.put("documentType", "PHOTO");
        request.put("uploadedBy", "admin");

        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName", is("photo.jpg")));

        verify(claimService).addDocument(eq(1L), any());
    }

    @Test
    void getPayments_returnsPayments() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setPaymentType("SETTLEMENT");
        payment.setReferenceNumber("PAY-001");
        payment.setStatus("COMPLETED");

        when(claimService.getClaimPayments(1L)).thenReturn(List.of(payment));

        mockMvc.perform(get("/api/claims/1/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].amount", is(3000.00)));

        verify(claimService).getClaimPayments(1L);
    }

    @Test
    void issuePayment_returns201() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setPaymentType("SETTLEMENT");
        payment.setReferenceNumber("PAY-001");
        payment.setStatus("COMPLETED");

        when(claimService.issuePayment(eq(1L), any())).thenReturn(payment);

        Map<String, Object> request = Map.of("amount", 3000.00);

        mockMvc.perform(post("/api/claims/1/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount", is(3000.00)));

        verify(claimService).issuePayment(eq(1L), any());
    }

    @Test
    void closeClaim_withSubrogation() throws Exception {
        Claim claim = createMockClaim();
        claim.setStatus("CLOSED");
        claim.setSubrogationFlag(true);

        when(claimService.closeClaim(1L, true)).thenReturn(claim);

        Map<String, Object> request = Map.of("subrogation", true);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(true)));

        verify(claimService).closeClaim(1L, true);
    }

    @Test
    void closeClaim_withoutSubrogation() throws Exception {
        Claim claim = createMockClaim();
        claim.setStatus("CLOSED");
        claim.setSubrogationFlag(false);

        when(claimService.closeClaim(1L, false)).thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(false)));

        verify(claimService).closeClaim(1L, false);
    }
}
