package com.pnc.claims.controller;

import com.pnc.claims.entity.AppUser;
import com.pnc.claims.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<AppUser> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{id}")
    public AppUser getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }
}
