package com.pnc.claims.controller;

import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.NotificationLog;
import com.pnc.claims.service.ClaimService;
import com.pnc.claims.service.NotificationService;
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

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClaimController.class)
class ClaimControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ClaimService claimService;

    @MockBean
    private NotificationService notificationService;

    private Claim createMockClaim(Long id, String claimNumber,
                                   String status) {
        Claim claim = new Claim();
        claim.setId(id);
        claim.setClaimNumber(claimNumber);
        claim.setStatus(status);
        claim.setLossType("COLLISION");
        claim.setSeverityScore(5);
        claim.setLossDate(LocalDate.of(2024, 9, 10));
        claim.setClaimantName("Test User");
        claim.setClaimantPhone("555-0001");
        return claim;
    }

    @Test
    void getAllClaims_shouldReturnList() throws Exception {
        Claim claim = createMockClaim(1L, "CLM-001", "OPEN");
        when(claimService.getAllClaims()).thenReturn(List.of(claim));

        mockMvc.perform(get("/api/claims"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].claimNumber", is("CLM-001")));
    }

    @Test
    void getAllClaims_withStatusFilter_shouldDelegateToSearch()
            throws Exception {
        Claim claim = createMockClaim(1L, "CLM-001", "OPEN");
        when(claimService.searchClaims(
                eq("OPEN"), any(), any(), any(), any()))
                .thenReturn(List.of(claim));

        mockMvc.perform(get("/api/claims").param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status", is("OPEN")));
    }

    @Test
    void getAllClaims_withSearchParam_shouldDelegateToSearch()
            throws Exception {
        Claim claim = createMockClaim(1L, "CLM-001", "OPEN");
        when(claimService.searchClaims(
                any(), eq("alice"), any(), any(), any()))
                .thenReturn(List.of(claim));

        mockMvc.perform(get("/api/claims").param("search", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));
    }

    @Test
    void getAllClaims_withLossTypeFilter_shouldDelegateToSearch()
            throws Exception {
        when(claimService.searchClaims(
                any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/claims")
                        .param("lossType", "COLLISION")
                        .param("lossType", "THEFT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getAllClaims_withDateRange_shouldDelegateToSearch()
            throws Exception {
        when(claimService.searchClaims(
                any(), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/claims")
                        .param("lossDateFrom", "2024-09-01")
                        .param("lossDateTo", "2024-09-30"))
                .andExpect(status().isOk());
    }

    @Test
    void getClaimById_shouldReturnClaim() throws Exception {
        Claim claim = createMockClaim(1L, "CLM-001", "OPEN");
        when(claimService.getClaimById(1L)).thenReturn(claim);

        mockMvc.perform(get("/api/claims/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimNumber", is("CLM-001")));
    }

    @Test
    void getClaimById_notFound_shouldThrow() {
        when(claimService.getClaimById(999L))
                .thenThrow(new RuntimeException("Claim not found: 999"));

        assertThrows(Exception.class, () ->
                mockMvc.perform(get("/api/claims/999")));
    }

    @Test
    void createClaim_shouldReturn201() throws Exception {
        Claim claim = createMockClaim(100L, "CLM-NEW", "OPEN");
        when(claimService.createClaim(any())).thenReturn(claim);

        mockMvc.perform(post("/api/claims")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"policyId\":1,\"lossType\":\"COLLISION\","
                                + "\"severityScore\":5,\"lossDate\":\"2024-10-01\","
                                + "\"lossDescription\":\"Test\","
                                + "\"claimantName\":\"Test\","
                                + "\"claimantPhone\":\"555\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.claimNumber", is("CLM-NEW")));
    }

    @Test
    void updateClaimStatus_shouldReturnUpdatedClaim() throws Exception {
        Claim claim = createMockClaim(1L, "CLM-001",
                "UNDER_INVESTIGATION");
        when(claimService.updateClaimStatus(eq(1L),
                eq("UNDER_INVESTIGATION"), any())).thenReturn(claim);

        mockMvc.perform(patch("/api/claims/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_INVESTIGATION\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status",
                        is("UNDER_INVESTIGATION")));
    }

    @Test
    void getNotifications_shouldReturnList() throws Exception {
        NotificationLog log = new NotificationLog();
        log.setId(1L);
        log.setClaimId(1L);
        log.setSubject("Status changed");
        log.setStatus("PENDING");
        when(notificationService.getNotificationsForClaim(1L))
                .thenReturn(List.of(log));

        mockMvc.perform(get("/api/claims/1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].subject",
                        is("Status changed")));
    }

    @Test
    void closeClaim_shouldReturnClosedClaim() throws Exception {
        Claim claim = createMockClaim(1L, "CLM-001", "CLOSED");
        claim.setSubrogationFlag(true);
        when(claimService.closeClaim(1L, true)).thenReturn(claim);

        mockMvc.perform(post("/api/claims/1/close")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"subrogation\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("CLOSED")))
                .andExpect(jsonPath("$.subrogationFlag", is(true)));
    }
}
