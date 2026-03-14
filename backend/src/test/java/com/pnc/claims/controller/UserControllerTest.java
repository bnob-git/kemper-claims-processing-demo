package com.pnc.claims.controller;

import com.pnc.claims.entity.AppUser;
import com.pnc.claims.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    private AppUser sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new AppUser();
        sampleUser.setId(1L);
        sampleUser.setUsername("jsmith");
        sampleUser.setFullName("John Smith");
        sampleUser.setRole("SENIOR_ADJUSTER");
        sampleUser.setEmail("jsmith@example.com");
    }

    @Test
    void getAllUsers_returnsList() throws Exception {
        AppUser user2 = new AppUser();
        user2.setId(2L);
        user2.setUsername("mwilliams");
        user2.setFullName("Maria Williams");
        user2.setRole("ADJUSTER");
        user2.setEmail("mwilliams@example.com");

        when(userRepository.findAll()).thenReturn(List.of(sampleUser, user2));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].username").value("jsmith"))
                .andExpect(jsonPath("$[0].role").value("SENIOR_ADJUSTER"))
                .andExpect(jsonPath("$[1].username").value("mwilliams"));
    }

    @Test
    void getAllUsers_emptyList_returnsEmptyArray() throws Exception {
        when(userRepository.findAll()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void getUserById_existing_returnsUser() throws Exception {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser));

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("jsmith"))
                .andExpect(jsonPath("$.fullName").value("John Smith"))
                .andExpect(jsonPath("$.role").value("SENIOR_ADJUSTER"))
                .andExpect(jsonPath("$.email").value("jsmith@example.com"));
    }

    @Test
    void getUserById_notFound_throwsException() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(Exception.class, () ->
                mockMvc.perform(get("/api/users/999")));
    }
}
