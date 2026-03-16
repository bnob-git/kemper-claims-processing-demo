package com.pnc.claims.controller;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import com.pnc.claims.service.ClaimService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClaimControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
    void getAllClaims_withBlankStatus_returnsAll() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    void getClaimById_existingClaim() throws Exception {
        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.claimNumber", is("CLM-2024-0001")));
    }

    @Test
    void createClaim_returnsCreated() throws Exception {
        String json = """
                {
                    "policyId": 1,
                    "lossType": "COLLISION",
                    "severityScore": 5,
                    "lossDate": "2024-10-01",
                    "lossDescription": "Test collision",
                    "claimantName": "Test User",
                    "claimantPhone": "555-9999"
                }
                """;
        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("OPEN")))
                .andExpect(jsonPath("$.lossType", is("COLLISION")));
    }

    @Test
    void updateClaimStatus() throws Exception {
        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"UNDER_INVESTIGATION\"}")
                        .header("X-User", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void updateClaimStatus_defaultUser() throws Exception {
        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"UNDER_INVESTIGATION\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_INVESTIGATION")));
    }

    @Test
    void getClaimEvents() throws Exception {
        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void getAssignments() throws Exception {
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
        String json = """
                {
                    "adjusterId": 2,
                    "notes": "Manual assignment test"
                }
                """;
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("MANUAL")))
                .andExpect(jsonPath("$.notes", is("Manual assignment test")));
    }

    @Test
    void createAssignment_manualAssignWithoutNotes() throws Exception {
        String json = "{\"adjusterId\": 2}";
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType", is("MANUAL")));
    }

    @Test
    void reserveDecision_approveWithAmount() throws Exception {
        String json = "{\"decision\": \"APPROVE\", \"amount\": 5000}";
        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")))
                .andExpect(jsonPath("$.reserveAmount", is(5000)));
    }

    @Test
    void reserveDecision_approveWithoutAmount() throws Exception {
        String json = "{\"decision\": \"APPROVE\"}";
        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("RESERVE_SET")));
    }

    @Test
    void reserveDecision_deny() throws Exception {
        String json = "{\"decision\": \"DENY\"}";
        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("DENIED")));
    }

    @Test
    void getDocuments() throws Exception {
        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void addDocument() throws Exception {
        String json = """
                {
                    "fileName": "test.pdf",
                    "documentType": "EVIDENCE",
                    "uploadedBy": "testuser",
                    "notes": "Test document"
                }
                """;
        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName", is("test.pdf")))
                .andExpect(jsonPath("$.documentType", is("EVIDENCE")));
    }

    @Test
    void getPayments() throws Exception {
        mockMvc.perform(get("/api/claims/4/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void issuePayment() throws Exception {
        String json = "{\"amount\": 3000.00, \"createdBy\": \"testuser\"}";
        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("COMPLETED")));
    }

    @Test
    void closeClaim_withSubrogation() throws Exception {
        String json = "{\"subrogation\": true}";
        mockMvc.perform(post("/api/claims/4/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(true)));
    }

    @Test
    void closeClaim_withoutSubrogation() throws Exception {
        String json = "{\"subrogation\": false}";
        mockMvc.perform(post("/api/claims/4/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(false)));
    }

    @Test
    void closeClaim_noBody() throws Exception {
        mockMvc.perform(post("/api/claims/4/close")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")));
    }
}
