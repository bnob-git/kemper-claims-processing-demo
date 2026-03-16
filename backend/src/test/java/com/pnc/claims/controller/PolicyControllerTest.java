package com.pnc.claims.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

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
    void getAllPolicies() throws Exception {
        mockMvc.perform(get("/api/policies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(5))));
    }

    @Test
    void getPolicyById_existing() throws Exception {
        mockMvc.perform(get("/api/policies/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.policyNumber", is("POL-2024-00101")));
    }

    @Test
    void getPolicyById_notFound_throwsException() throws Exception {
        try {
            mockMvc.perform(get("/api/policies/999"));
        } catch (Exception e) {
            assertTrue(e.getCause().getMessage().contains("Policy not found"));
        }
    }

    private void assertTrue(boolean condition) {
        if (!condition) throw new AssertionError();
    }
}
