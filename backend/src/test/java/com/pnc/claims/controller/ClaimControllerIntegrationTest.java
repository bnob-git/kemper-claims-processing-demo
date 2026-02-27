package com.pnc.claims.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClaimControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllClaims_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].claimNumber", notNullValue()));
    }

    @Test
    void getClaimsByStatus_ShouldFilterCorrectly() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].status", everyItem(is("OPEN"))));
    }

    @Test
    void getClaimById_ShouldReturnClaim() throws Exception {
        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber").value("CLM-2024-0001"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.policy.policyNumber").value("POL-2024-00101"));
    }

    @Test
    void createClaim_ShouldReturn201() throws Exception {
        String body = """
                {
                    "policyId": 1,
                    "lossType": "COLLISION",
                    "severityScore": 6,
                    "lossDate": "2024-11-01",
                    "lossDescription": "Integration test claim",
                    "claimantName": "API Test User",
                    "claimantPhone": "555-1234"
                }
                """;
        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber", startsWith("CLM-")))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.lossType").value("COLLISION"));
    }

    @Test
    void updateClaimStatus_ShouldReturnUpdated() throws Exception {
        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"UNDER_INVESTIGATION\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_INVESTIGATION"));
    }

    @Test
    void getClaimEvents_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void autoAssignClaim_ShouldReturn201() throws Exception {
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType").value("AUTO"));
    }

    @Test
    void manualAssignClaim_ShouldReturn201() throws Exception {
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"adjusterId\": 2, \"notes\": \"Manual test\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType").value("MANUAL"));
    }

    @Test
    void reserveDecision_Approve_ShouldSetReserve() throws Exception {
        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"APPROVE\", \"amount\": 5000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESERVE_SET"))
                .andExpect(jsonPath("$.reserveAmount").value(5000));
    }

    @Test
    void reserveDecision_Deny_ShouldDeny() throws Exception {
        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\": \"DENY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DENIED"));
    }

    @Test
    void addDocument_ShouldReturn201() throws Exception {
        mockMvc.perform(post("/api/claims/1/documents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fileName\": \"test.pdf\", \"documentType\": \"POLICE_REPORT\", \"uploadedBy\": \"test\", \"notes\": \"note\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fileName").value("test.pdf"));
    }

    @Test
    void issuePayment_ShouldReturn201() throws Exception {
        // Claim 3 is in RESERVE_SET status
        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\": 2500}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.referenceNumber", startsWith("PAY-")));
    }

    @Test
    void closeClaim_ShouldClose() throws Exception {
        // Settle claim 3 first, then close
        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\": 2500}"));
        mockMvc.perform(post("/api/claims/3/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.subrogationFlag").value(true));
    }

    @Test
    void getDocuments_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void getPayments_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/claims/4/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    void getAssignments_ShouldReturnList() throws Exception {
        mockMvc.perform(get("/api/claims/1/assignments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }
}
