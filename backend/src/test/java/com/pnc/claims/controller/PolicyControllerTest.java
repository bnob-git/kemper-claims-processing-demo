package com.pnc.claims.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllPolicies_ReturnsPolicies() throws Exception {
        mockMvc.perform(get("/api/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$[0].policyNumber", notNullValue()));
    }

    @Test
    void getPolicyById_ExistingPolicy_ReturnsPolicy() throws Exception {
        mockMvc.perform(get("/api/policies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyNumber", is("POL-2024-00101")))
                .andExpect(jsonPath("$.holderName", is("Alice Henderson")))
                .andExpect(jsonPath("$.vehicleMake", is("Honda")));
    }

    @Test
    void getPolicyById_NonExistingPolicy_ThrowsException() {
        assertThrows(Exception.class, () ->
            mockMvc.perform(get("/api/policies/9999")));
    }
}
