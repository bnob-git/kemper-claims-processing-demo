package com.pnc.claims.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
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

    @Test
    void getAllClaims_returnsAllClaims() throws Exception {
        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    void getAllClaims_withStatusFilter() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status", is("OPEN")));
    }

    @Test
    void getAllClaims_withEmptyStatusFilter() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    void getClaimById_existingClaim() throws Exception {
        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.claimNumber", is("CLM-2024-0001")))
                .andExpect(jsonPath("$.status", is("OPEN")));
    }

    @Test
    void getClaimById_notFound() {
        Exception thrown = assertThrows(Exception.class, () ->
                mockMvc.perform(get("/api/claims/9999")));
        assertTrue(thrown.getCause() instanceof RuntimeException
                || thrown.getMessage().contains("Claim not found"));
    }

    @Test
    void createClaim_success() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("policyId", 1L);
        request.put("lossType", "COLLISION");
        request.put("severityScore", 5);
        request.put("lossDate", "2024-10-01");
        request.put("lossDescription", "Test claim via controller");
        request.put("claimantName", "Controller Test User");
        request.put("claimantPhone", "555-8888");

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.lossType", is("COLLISION")))
                .andExpect(jsonPath("$.claimantName", is("Controller Test User")));
    }

    @Test
    void updateClaimStatus_success() throws Exception {
        Map<String, String> request = new HashMap<>();
        request.put("status", "UNDER_INVESTIGATION");

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void updateClaimStatus_withCustomUser() throws Exception {
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
    void getClaimEvents_success() throws Exception {
        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void getAssignments_success() throws Exception {
        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void createAssignment_autoAssign() throws Exception {
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("AUTO")));
    }

    @Test
    void createAssignment_manualAssign() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("adjusterId", 2L);
        request.put("notes", "Manual assignment test");

        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("MANUAL")));
    }

    @Test
    void reserveDecision_approveWithAmount() throws Exception {
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
    void reserveDecision_approveWithoutAmount() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("decision", "APPROVE");

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")));
    }

    @Test
    void reserveDecision_deny() throws Exception {
        Map<String, Object> request = new HashMap<>();
        request.put("decision", "DENY");

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DENIED")));
    }

    @Test
    void getDocuments_success() throws Exception {
        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void addDocument_success() throws Exception {
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
    void getPayments_success() throws Exception {
        mockMvc.perform(get("/api/claims/4/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void issuePayment_success() throws Exception {
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
    void closeClaim_withSubrogation() throws Exception {
        // Settle claim 3 first
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payRequest)))
                .andExpect(status().isCreated());

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
    void closeClaim_withoutBody() throws Exception {
        // Settle claim 3 first
        Map<String, Object> payRequest = new HashMap<>();
        payRequest.put("amount", "3000.00");
        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payRequest)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/claims/3/close")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(false)));
    }
}
