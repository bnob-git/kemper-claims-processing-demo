package com.pnc.claims.controller;

import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.PolicyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import jakarta.servlet.ServletException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PolicyController.class)
class PolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PolicyRepository policyRepository;

    @Test
    void getAllPolicies_returnsPolicyList() throws Exception {
        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("Test Holder");
        when(policyRepository.findAll()).thenReturn(List.of(policy));

        mockMvc.perform(get("/api/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].policyNumber").value("POL-001"));
    }

    @Test
    void getPolicyById_returnsPolicy_whenFound() throws Exception {
        Policy policy = new Policy();
        policy.setId(1L);
        policy.setPolicyNumber("POL-001");
        policy.setHolderName("Test Holder");
        when(policyRepository.findById(1L)).thenReturn(Optional.of(policy));

        mockMvc.perform(get("/api/policies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyNumber").value("POL-001"));
    }

    @Test
    void getPolicyById_throws_whenNotFound() throws Exception {
        when(policyRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ServletException.class, () ->
            mockMvc.perform(get("/api/policies/99")));
    }
}
