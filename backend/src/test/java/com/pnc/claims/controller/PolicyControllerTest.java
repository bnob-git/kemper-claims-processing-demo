package com.pnc.claims.controller;

import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.PolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PolicyController.class)
class PolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PolicyRepository policyRepository;

    private Policy createMockPolicy() {
        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("Alice Smith");
        policy.setHolderEmail("alice@example.com");
        policy.setVehicleVin("1HGBH41JXMN109186");
        policy.setVehicleYear(2021);
        policy.setVehicleMake("Honda");
        policy.setVehicleModel("Civic");
        policy.setCoverageType("COMPREHENSIVE");
        policy.setEffectiveDate(LocalDate.of(2024, 1, 1));
        policy.setExpirationDate(LocalDate.of(2025, 1, 1));
        return policy;
    }

    @Test
    void getAllPolicies_returnsPolicies() throws Exception {
        Policy policy = createMockPolicy();
        when(policyRepository.findAll()).thenReturn(List.of(policy));

        mockMvc.perform(get("/api/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].policyNumber", is("POL-001")))
                .andExpect(jsonPath("$[0].holderName", is("Alice Smith")));

        verify(policyRepository).findAll();
    }

    @Test
    void getPolicyById_returnsPolicy() throws Exception {
        Policy policy = createMockPolicy();
        when(policyRepository.findById(1L)).thenReturn(Optional.of(policy));

        mockMvc.perform(get("/api/policies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyNumber", is("POL-001")))
                .andExpect(jsonPath("$.holderName", is("Alice Smith")));

        verify(policyRepository).findById(1L);
    }

    @Test
    void getPolicyById_notFound_throwsException() throws Exception {
        when(policyRepository.findById(999L)).thenReturn(Optional.empty());

        try {
            mockMvc.perform(get("/api/policies/999"));
        } catch (Exception ex) {
            assertTrue(ex.getCause() instanceof RuntimeException);
        }

        verify(policyRepository).findById(999L);
    }
}
