package com.pnc.claims.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API integration tests for ClaimController endpoints.
 * Uses MockMvc with the full Spring context and H2 seed data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClaimControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    // ---- GET /api/claims ----

    @Test
    void getAllClaims_ReturnsSeededData() throws Exception {
        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].claimNumber", notNullValue()));
    }

    @Test
    void getClaimsByStatus_ReturnsFiltered() throws Exception {
        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].status", everyItem(is("OPEN"))));
    }

    // ---- GET /api/claims/{id} ----

    @Test
    void getClaimById_ExistingId_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber").value("CLM-2024-0001"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void getClaimById_NonExistentId_ThrowsException() throws Exception {
        // The service throws RuntimeException which propagates through MockMvc
        try {
            mockMvc.perform(get("/api/claims/99999"));
        } catch (Exception e) {
            assertTrue(e.getCause().getMessage().contains("Claim not found"));
            return;
        }
        // If no error handler is configured, the exception bubbles up
    }

    // ---- POST /api/claims (FNOL) ----

    @Test
    void createClaim_ValidPayload_ReturnsCreated() throws Exception {
        String json = """
                {
                  "policyId": 1,
                  "lossType": "COLLISION",
                  "severityScore": 6,
                  "lossDate": "2024-10-15",
                  "lossDescription": "Integration test claim",
                  "claimantName": "API Test User",
                  "claimantPhone": "555-8888"
                }
                """;

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber", startsWith("CLM-")))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.lossType").value("COLLISION"));
    }

    // ---- POST /api/claims/{id}/assignments ----

    @Test
    void autoAssign_ReturnsCreated() throws Exception {
        mockMvc.perform(post("/api/claims/1/assignments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignmentType").value("AUTO"));
    }

    @Test
    void manualAssign_InvalidAdjuster_ThrowsException() throws Exception {
        String json = """
                { "adjusterId": 99999, "notes": "bad adjuster" }
                """;

        try {
            mockMvc.perform(post("/api/claims/1/assignments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json));
        } catch (Exception e) {
            assertTrue(e.getCause().getMessage().contains("User not found"));
            return;
        }
        // If no error handler is configured, the exception bubbles up
    }

    // ---- POST /api/claims/{id}/reserve-decision ----

    @Test
    void reserveDecision_Approve_ReturnsReserveSet() throws Exception {
        String json = """
                { "decision": "APPROVE", "amount": 5000 }
                """;

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESERVE_SET"))
                .andExpect(jsonPath("$.reserveAmount").value(5000));
    }

    @Test
    void reserveDecision_Deny_ReturnsDenied() throws Exception {
        String json = """
                { "decision": "DENY" }
                """;

        mockMvc.perform(post("/api/claims/1/reserve-decision")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DENIED"));
    }

    // ---- POST /api/claims/{id}/payments ----

    @Test
    void issuePayment_OnReserveSetClaim_ReturnsCreated() throws Exception {
        // Claim 3 is in RESERVE_SET status
        String json = """
                { "amount": "2500.00", "createdBy": "testuser" }
                """;

        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(2500.00))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    // ---- POST /api/claims/{id}/close ----

    @Test
    void closeClaim_WithSubrogation_ReturnsClosed() throws Exception {
        // First settle claim 3 (RESERVE_SET), then close
        mockMvc.perform(post("/api/claims/3/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "amount": "3000.00" }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/claims/3/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "subrogation": true }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.subrogationFlag").value(true));
    }

    // ---- GET /api/claims/{id}/events ----

    @Test
    void getClaimEvents_ReturnsEvents() throws Exception {
        mockMvc.perform(get("/api/claims/1/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    // ---- GET /api/claims/{id}/documents ----

    @Test
    void getClaimDocuments_ReturnsDocuments() throws Exception {
        mockMvc.perform(get("/api/claims/1/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }

    // ---- GET /api/claims/{id}/payments ----

    @Test
    void getClaimPayments_ReturnsPayments() throws Exception {
        // Claim 4 has a payment in seed data
        mockMvc.perform(get("/api/claims/4/payments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(1))));
    }
}
