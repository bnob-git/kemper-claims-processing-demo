package com.pnc.claims.service;

import com.pnc.claims.controller.ChatResponse;
import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.ClaimRepository;
import com.pnc.claims.repository.PolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatBotServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @Mock
    private PolicyRepository policyRepository;

    @InjectMocks
    private ChatBotService chatBotService;

    private Claim sampleClaim;
    private Policy samplePolicy;

    @BeforeEach
    void setUp() {
        sampleClaim = new Claim();
        sampleClaim.setId(1L);
        sampleClaim.setClaimNumber("CLM-A1B2C3D4");
        sampleClaim.setStatus("OPEN");
        sampleClaim.setLossType("COLLISION");
        sampleClaim.setSeverityScore(5);
        sampleClaim.setReserveAmount(new BigDecimal("5000.00"));

        samplePolicy = new Policy();
        samplePolicy.setId(1L);
        samplePolicy.setPolicyNumber("POL-001");
        samplePolicy.setHolderName("John Doe");
        samplePolicy.setVehicleYear(2022);
        samplePolicy.setVehicleMake("Toyota");
        samplePolicy.setVehicleModel("Camry");
        samplePolicy.setCoverageType("COMPREHENSIVE");
    }

    @Test
    void testClaimLookup_Found() {
        when(claimRepository.findByClaimNumber("CLM-A1B2C3D4"))
            .thenReturn(Optional.of(sampleClaim));

        ChatResponse resp = chatBotService.processMessage(
            "Look up CLM-A1B2C3D4");

        assertNotNull(resp);
        assertTrue(resp.getReply().contains("CLM-A1B2C3D4"));
        assertTrue(resp.getReply().contains("OPEN"));
        assertNotNull(resp.getData());
        assertNotNull(resp.getSuggestions());
    }

    @Test
    void testClaimLookup_NotFound() {
        when(claimRepository.findByClaimNumber("CLM-ZZZZZZZZ"))
            .thenReturn(Optional.empty());

        ChatResponse resp = chatBotService.processMessage(
            "Show me CLM-ZZZZZZZZ");

        assertTrue(resp.getReply().contains("couldn't find"));
        assertNull(resp.getData());
    }

    @Test
    void testPolicyLookup_Found() {
        when(policyRepository.findAll())
            .thenReturn(Collections.singletonList(samplePolicy));

        ChatResponse resp = chatBotService.processMessage(
            "What is POL-001?");

        assertTrue(resp.getReply().contains("POL-001"));
        assertTrue(resp.getReply().contains("John Doe"));
        assertNotNull(resp.getData());
    }

    @Test
    void testPolicyLookup_NotFound() {
        when(policyRepository.findAll())
            .thenReturn(Collections.emptyList());

        ChatResponse resp = chatBotService.processMessage(
            "Tell me about POL-999");

        assertTrue(resp.getReply().contains("couldn't find"));
    }

    @Test
    void testListClaims_All() {
        when(claimRepository.findAll())
            .thenReturn(Arrays.asList(sampleClaim));

        ChatResponse resp = chatBotService.processMessage(
            "show my claims");

        assertTrue(resp.getReply().contains("1 claim(s)"));
        assertTrue(resp.getReply().contains("CLM-A1B2C3D4"));
    }

    @Test
    void testListClaims_OpenFilter() {
        when(claimRepository.findByStatus("OPEN"))
            .thenReturn(Arrays.asList(sampleClaim));

        ChatResponse resp = chatBotService.processMessage(
            "open claims");

        assertTrue(resp.getReply().contains("1 claim(s)"));
    }

    @Test
    void testWorkflowHelp_Fnol() {
        ChatResponse resp = chatBotService.processMessage(
            "how to file a claim");

        assertTrue(resp.getReply().contains("/fnol"));
    }

    @Test
    void testWorkflowHelp_Triage() {
        ChatResponse resp = chatBotService.processMessage(
            "how does triage work?");

        assertTrue(resp.getReply().contains("triage"));
    }

    @Test
    void testWorkflowHelp_Settlement() {
        ChatResponse resp = chatBotService.processMessage(
            "tell me about settlement");

        assertTrue(resp.getReply().contains("settlement"));
    }

    @Test
    void testNavigation_Dashboard() {
        ChatResponse resp = chatBotService.processMessage(
            "go to dashboard");

        assertTrue(resp.getReply().contains("dashboard"));
    }

    @Test
    void testFallback_EmptyMessage() {
        ChatResponse resp = chatBotService.processMessage("");

        assertTrue(resp.getReply().contains("Claims Assistant"));
        assertNotNull(resp.getSuggestions());
    }

    @Test
    void testFallback_UnrecognizedMessage() {
        ChatResponse resp = chatBotService.processMessage(
            "what is the weather today?");

        assertTrue(resp.getReply().contains("Claims Assistant"));
    }

    @Test
    void testFallback_NullMessage() {
        ChatResponse resp = chatBotService.processMessage(null);

        assertTrue(resp.getReply().contains("Claims Assistant"));
    }
}
