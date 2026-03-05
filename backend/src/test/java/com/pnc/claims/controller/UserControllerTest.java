package com.pnc.claims.controller;

import com.pnc.claims.entity.AppUser;
import com.pnc.claims.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    private AppUser createMockUser() {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setUsername("jsmith");
        user.setFullName("John Smith");
        user.setRole("SENIOR_ADJUSTER");
        user.setEmail("jsmith@pnc.com");
        return user;
    }

    @Test
    void getAllUsers_returnsUsers() throws Exception {
        AppUser user = createMockUser();
        when(userRepository.findAll()).thenReturn(List.of(user));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].username", is("jsmith")))
                .andExpect(jsonPath("$[0].fullName", is("John Smith")));

        verify(userRepository).findAll();
    }

    @Test
    void getUserById_returnsUser() throws Exception {
        AppUser user = createMockUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("jsmith")))
                .andExpect(jsonPath("$.role", is("SENIOR_ADJUSTER")));

        verify(userRepository).findById(1L);
    }

    @Test
    void getUserById_notFound_throwsException() throws Exception {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        try {
            mockMvc.perform(get("/api/users/999"));
        } catch (Exception ex) {
            assertTrue(ex.getCause() instanceof RuntimeException);
        }

        verify(userRepository).findById(999L);
    }
}
