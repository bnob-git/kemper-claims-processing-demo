package com.pnc.claims.controller;

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
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

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

    private Claim createTestClaim(Long id, String claimNumber, String status) {
        Claim claim = new Claim();
        claim.setId(id);
        claim.setClaimNumber(claimNumber);
        claim.setStatus(status);
        claim.setLossType("COLLISION");
        claim.setSeverityScore(5);
        claim.setLossDate(LocalDate.of(2024, 9, 10));
        claim.setLossDescription("Test claim");
        claim.setReportedDate(LocalDate.of(2024, 9, 10));
        claim.setClaimantName("Test User");
        claim.setClaimantPhone("555-0101");
        claim.setSubrogationFlag(false);

        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("Test Holder");
        claim.setPolicy(policy);

        return claim;
    }

    @Test
    void getAllClaims_ReturnsAllClaims() throws Exception {
        List<Claim> claims = Arrays.asList(
                createTestClaim(1L, "CLM-001", "OPEN"),
                createTestClaim(2L, "CLM-002", "CLOSED")
        );
        when(claimService.getAllClaims()).thenReturn(claims);

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].claimNumber", is("CLM-001")))
                .andExpect(jsonPath("$[1].claimNumber", is("CLM-002")));
    }

    @Test
    void getAllClaims_WithStatusFilter() throws Exception {
        List<Claim> claims = Collections.singletonList(
                createTestClaim(1L, "CLM-001", "OPEN")
        );
        when(claimService.getClaimsByStatus("OPEN")).thenReturn(claims);

        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].status", is("OPEN")));

        verify(claimService).getClaimsByStatus("OPEN");
        verify(claimService, never()).getAllClaims();
    }

    @Test
    void getAllClaims_WithBlankStatus_ReturnsAll() throws Exception {
        List<Claim> claims = Arrays.asList(
                createTestClaim(1L, "CLM-001", "OPEN"),
                createTestClaim(2L, "CLM-002", "CLOSED")
        );
        when(claimService.getAllClaims()).thenReturn(claims);

        mockMvc.perform(get("/api/claims").param("status", "  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));

        verify(claimService).getAllClaims();
    }

    @Test
    void getClaimById_ReturnsClaim() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "OPEN");
        when(claimService.getClaimById(1L)).thenReturn(claim);

        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber", is("CLM-001")))
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.lossType", is("COLLISION")));
    }

    @Test
    void createClaim_Returns201() throws Exception {
        Claim claim = createTestClaim(100L, "CLM-NEW", "OPEN");
        when(claimService.createClaim(any())).thenReturn(claim);

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"policyId\":1,\"lossType\":\"COLLISION\",\"severityScore\":5,"
                                + "\"lossDate\":\"2024-10-01\",\"lossDescription\":\"Test\","
                                + "\"claimantName\":\"Test\",\"claimantPhone\":\"555-0001\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber", is("CLM-NEW")))
                .andExpect(jsonPath("$.status", is("OPEN")));
    }

    @Test
    void updateClaimStatus_ReturnsUpdatedClaim() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "UNDER_INVESTIGATION");
        when(claimService.updateClaimStatus(eq(1L), eq("UNDER_INVESTIGATION"), eq("testuser")))
                .thenReturn(claim);

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_INVESTIGATION\"}")
                        .header("X-User", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void updateClaimStatus_DefaultUser() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "UNDER_INVESTIGATION");
        when(claimService.updateClaimStatus(eq(1L), eq("UNDER_INVESTIGATION"), eq("system")))
                .thenReturn(claim);

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_INVESTIGATION\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void getClaimEvents_ReturnsList() throws Exception {
        ClaimEvent event = new ClaimEvent();
        event.setId(1L);
        event.setClaimId(1L);
        event.setEventType("STATUS_CHANGE");
        event.setNewStatus("OPEN");
        event.setNotes("FNOL submitted");
        event.setCreatedBy("system");

        when(claimService.getClaimEvents(1L)).thenReturn(Collections.singletonList(event));

        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].eventType", is("STATUS_CHANGE")));
    }

    @Test
    void getAssignments_ReturnsList() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(1L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignmentType("AUTO");
        assignment.setAssignedDate(LocalDate.now());

        when(claimService.getClaimAssignments(1L)).thenReturn(Collections.singletonList(assignment));

        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].assignmentType", is("AUTO")));
    }

    @Test
    void createAssignment_AutoAssign() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(100L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(2L);
        assignment.setAssignmentType("AUTO");

        when(claimService.autoAssignClaim(1L)).thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("AUTO")));

        verify(claimService).autoAssignClaim(1L);
    }

    @Test
    void createAssignment_ManualAssign() throws Exception {
        Assignment assignment = new Assignment();
        assignment.setId(100L);
        assignment.setClaimId(1L);
        assignment.setAdjusterId(3L);
        assignment.setAssignmentType("MANUAL");
        assignment.setNotes("Override assignment");

        when(claimService.manualAssignClaim(eq(1L), eq(3L), eq("Override assignment")))
                .thenReturn(assignment);

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adjusterId\":3,\"notes\":\"Override assignment\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("MANUAL")))
                .andExpect(jsonPath("$.notes", is("Override assignment")));

        verify(claimService).manualAssignClaim(1L, 3L, "Override assignment");
    }

    @Test
    void reserveDecision_WithAmount() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "RESERVE_SET");
        claim.setReserveAmount(new BigDecimal("5000.00"));
        when(claimService.setReserveDecision(eq(1L), eq("APPROVE"), eq(new BigDecimal("5000.00"))))
                .thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\",\"amount\":\"5000.00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")))
                .andExpect(jsonPath("$.reserveAmount", is(5000.00)));
    }

    @Test
    void reserveDecision_WithoutAmount() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "RESERVE_SET");
        claim.setReserveAmount(new BigDecimal("8050"));
        when(claimService.setReserveDecision(eq(1L), eq("APPROVE"), isNull()))
                .thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"APPROVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")));
    }

    @Test
    void getDocuments_ReturnsList() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(1L);
        doc.setClaimId(1L);
        doc.setFileName("report.pdf");
        doc.setDocumentType("POLICE_REPORT");

        when(claimService.getClaimDocuments(1L)).thenReturn(Collections.singletonList(doc));

        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fileName", is("report.pdf")));
    }

    @Test
    void addDocument_Returns201() throws Exception {
        DocumentMetadata doc = new DocumentMetadata();
        doc.setId(100L);
        doc.setClaimId(1L);
        doc.setFileName("new_doc.pdf");
        doc.setDocumentType("PHOTO");

        when(claimService.addDocument(eq(1L), any())).thenReturn(doc);

        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\":\"new_doc.pdf\",\"documentType\":\"PHOTO\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName", is("new_doc.pdf")));
    }

    @Test
    void getPayments_ReturnsList() throws Exception {
        Payment payment = new Payment();
        payment.setId(1L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("3000.00"));
        payment.setStatus("COMPLETED");

        when(claimService.getClaimPayments(1L)).thenReturn(Collections.singletonList(payment));

        mockMvc.perform(get("/api/claims/1/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].amount", is(3000.00)));
    }

    @Test
    void issuePayment_Returns201() throws Exception {
        Payment payment = new Payment();
        payment.setId(100L);
        payment.setClaimId(1L);
        payment.setAmount(new BigDecimal("2500.00"));
        payment.setStatus("COMPLETED");
        payment.setReferenceNumber("PAY-TEST");

        when(claimService.issuePayment(eq(1L), any())).thenReturn(payment);

        mockMvc.perform(post("/api/claims/1/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":\"2500.00\",\"createdBy\":\"testuser\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount", is(2500.00)))
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    void closeClaim_WithSubrogation() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "CLOSED");
        claim.setSubrogationFlag(true);
        when(claimService.closeClaim(eq(1L), eq(true))).thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(true)));
    }

    @Test
    void closeClaim_WithoutSubrogation() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "CLOSED");
        claim.setSubrogationFlag(false);
        when(claimService.closeClaim(eq(1L), eq(false))).thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(false)));
    }

    @Test
    void closeClaim_WithNullBody() throws Exception {
        Claim claim = createTestClaim(1L, "CLM-001", "CLOSED");
        claim.setSubrogationFlag(false);
        when(claimService.closeClaim(eq(1L), eq(false))).thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")));
    }
}
