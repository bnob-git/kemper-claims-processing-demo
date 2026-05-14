package com.pnc.claims.controller;

import com.pnc.claims.entity.AppUser;
import com.pnc.claims.repository.UserRepository;
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

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserRepository userRepository;

    @Test
    void getAllUsers_returnsUserList() throws Exception {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setUsername("testuser");
        user.setFullName("Test User");
        user.setRole("ADJUSTER");
        when(userRepository.findAll()).thenReturn(List.of(user));

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("testuser"));
    }

    @Test
    void getUserById_returnsUser_whenFound() throws Exception {
        AppUser user = new AppUser();
        user.setId(1L);
        user.setUsername("testuser");
        user.setFullName("Test User");
        user.setRole("ADJUSTER");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void getUserById_throws_whenNotFound() throws Exception {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ServletException.class, () ->
            mockMvc.perform(get("/api/users/99")));
    }
}
