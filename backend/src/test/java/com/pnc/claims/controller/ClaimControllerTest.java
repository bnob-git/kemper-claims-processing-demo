package com.pnc.claims.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pnc.claims.entity.Claim;
import com.pnc.claims.repository.ClaimRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClaimControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ClaimRepository claimRepository;

    @Test
    void getAllClaims_ReturnsAllClaims() throws Exception {
        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    void getAllClaims_WithStatusFilter_ReturnsFilteredClaims() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status", is("OPEN")));
    }

    @Test
    void getAllClaims_WithBlankStatusFilter_ReturnsAllClaims() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    void getClaimById_ExistingClaim_ReturnsClaim() throws Exception {
        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber", is("CLM-2024-0001")))
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.lossType", is("COLLISION")));
    }

    @Test
    void getClaimById_NonExistingClaim_ThrowsException() {
        assertThrows(Exception.class, () ->
            mockMvc.perform(get("/api/claims/9999")));
    }

    @Test
    void createClaim_ValidRequest_ReturnsCreated() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test collision");
        request.put("claimantName", "Test User");
        request.put("claimantPhone", "555-1234");

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.lossType", is("COLLISION")))
                .andExpect(jsonPath("$.claimNumber", startsWith("CLM-")));
    }

    @Test
    void updateClaimStatus_ValidRequest_ReturnsUpdatedClaim() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("status", "UNDER_INVESTIGATION");

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void updateClaimStatus_WithXUserHeader_ReturnsUpdatedClaim() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("status", "UNDER_INVESTIGATION");

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User", "testuser")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void getClaimEvents_ExistingClaim_ReturnsEvents() throws Exception {
        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void getAssignments_ExistingClaim_ReturnsAssignments() throws Exception {
        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void createAssignment_AutoAssign_ReturnsCreated() throws Exception {
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("AUTO")));
    }

    @Test
    void createAssignment_AutoAssign_NoBody_ReturnsCreated() throws Exception {
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("AUTO")));
    }

    @Test
    void createAssignment_ManualAssign_ReturnsCreated() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("adjusterId", 2L);
        request.put("notes", "Manual assignment for testing");

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("MANUAL")))
                .andExpect(jsonPath("$.notes", is("Manual assignment for testing")));
    }

    @Test
    void reserveDecision_ApproveWithAmount_ReturnsUpdatedClaim() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("decision", "APPROVE");
        request.put("amount", "5000.00");

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")))
                .andExpect(jsonPath("$.reserveAmount", is(5000.00)));
    }

    @Test
    void reserveDecision_ApproveWithoutAmount_ReturnsUpdatedClaim() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("decision", "APPROVE");

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")))
                .andExpect(jsonPath("$.reserveAmount", notNullValue()));
    }

    @Test
    void reserveDecision_Deny_ReturnsUpdatedClaim() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("decision", "DENY");

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DENIED")));
    }

    @Test
    void getDocuments_ExistingClaim_ReturnsDocuments() throws Exception {
        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void addDocument_ValidRequest_ReturnsCreated() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("fileName", "test_doc.pdf");
        request.put("documentType", "POLICE_REPORT");
        request.put("uploadedBy", "testuser");
        request.put("notes", "Test document");

        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName", is("test_doc.pdf")))
                .andExpect(jsonPath("$.documentType", is("POLICE_REPORT")));
    }

    @Test
    void getPayments_ExistingClaim_ReturnsPayments() throws Exception {
        mockMvc.perform(get("/api/claims/4/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void issuePayment_ValidRequest_ReturnsCreated() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("amount", "3000.00");
        request.put("createdBy", "testuser");

        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount", is(3000.00)))
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    void closeClaim_WithSubrogation_ReturnsClosedClaim() throws Exception {
        // First settle claim 3
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        mockMvc.perform(post("/api/claims/3/payments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payRequest)));

        Map<String, Object> closeRequest = new HashMap<>();
        closeRequest.put("subrogation", true);

        mockMvc.perform(post("/api/claims/3/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(closeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(true)));
    }

    @Test
    void closeClaim_WithoutSubrogation_ReturnsClosedClaim() throws Exception {
        // First settle claim 3
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        mockMvc.perform(post("/api/claims/3/payments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payRequest)));

        Map<String, Object> closeRequest = new HashMap<>();
        closeRequest.put("subrogation", false);

        mockMvc.perform(post("/api/claims/3/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(closeRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(false)));
    }

    @Test
    void closeClaim_NoBody_DefaultsNoSubrogation() throws Exception {
        // First settle claim 3
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        mockMvc.perform(post("/api/claims/3/payments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payRequest)));

        mockMvc.perform(post("/api/claims/3/close")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(false)));
    }
}
