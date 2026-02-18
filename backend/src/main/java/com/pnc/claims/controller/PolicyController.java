package com.pnc.claims.controller;

import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.PolicyRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/policies")
public class PolicyController {

    private final PolicyRepository policyRepository;

    public PolicyController(PolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    @GetMapping
    public List<Policy> getAllPolicies() {
        return policyRepository.findAll();
    }

    @GetMapping("/{id}")
    public Policy getPolicyById(@PathVariable Long id) {
        return policyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Policy not found: " + id));
    }
}
