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
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getAllUsers_ReturnsUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$[0].username", notNullValue()));
    }

    @Test
    void getUserById_ExistingUser_ReturnsUser() throws Exception {
        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("jsmith")))
                .andExpect(jsonPath("$.fullName", is("John Smith")))
                .andExpect(jsonPath("$.role", is("SENIOR_ADJUSTER")));
    }

    @Test
    void getUserById_NonExistingUser_ThrowsException() {
        assertThrows(Exception.class, () ->
            mockMvc.perform(get("/api/users/9999")));
    }
}
