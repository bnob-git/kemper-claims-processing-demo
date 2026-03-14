package com.pnc.claims.controller;

import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.PolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PolicyController.class)
class PolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PolicyRepository policyRepository;

    private Policy samplePolicy;

    @BeforeEach
    void setUp() {
        samplePolicy = new Policy();
        samplePolicy.setId(1L);
        samplePolicy.setPolicyNumber("POL-001");
        samplePolicy.setHolderName("Alice Johnson");
        samplePolicy.setHolderEmail("alice@example.com");
        samplePolicy.setVehicleVin("1HGCM82633A004352");
        samplePolicy.setVehicleYear(2021);
        samplePolicy.setVehicleMake("Honda");
        samplePolicy.setVehicleModel("Civic");
        samplePolicy.setCoverageType("COMPREHENSIVE");
        samplePolicy.setEffectiveDate(LocalDate.of(2024, 1, 1));
        samplePolicy.setExpirationDate(LocalDate.of(2025, 1, 1));
    }

    @Test
    void getAllPolicies_returnsList() throws Exception {
        when(policyRepository.findAll()).thenReturn(List.of(samplePolicy));

        mockMvc.perform(get("/api/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].policyNumber").value("POL-001"))
                .andExpect(jsonPath("$[0].holderName").value("Alice Johnson"));
    }

    @Test
    void getAllPolicies_emptyList_returnsEmptyArray() throws Exception {
        when(policyRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getPolicyById_existing_returnsPolicy() throws Exception {
        when(policyRepository.findById(1L)).thenReturn(Optional.of(samplePolicy));

        mockMvc.perform(get("/api/policies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyNumber").value("POL-001"))
                .andExpect(jsonPath("$.holderName").value("Alice Johnson"))
                .andExpect(jsonPath("$.vehicleMake").value("Honda"))
                .andExpect(jsonPath("$.coverageType").value("COMPREHENSIVE"));
    }

    @Test
    void getPolicyById_notFound_throwsException() {
        when(policyRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(Exception.class, () ->
                mockMvc.perform(get("/api/policies/999")));
    }
}
