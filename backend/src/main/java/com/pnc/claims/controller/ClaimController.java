package com.pnc.claims.controller;

import com.pnc.claims.entity.*;
import com.pnc.claims.entity.NotificationLog;
import com.pnc.claims.service.ClaimService;
import com.pnc.claims.service.NotificationService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private final ClaimService claimService;
    private final NotificationService notificationService;

    public ClaimController(ClaimService claimService,
                           NotificationService notificationService) {
        this.claimService = claimService;
        this.notificationService = notificationService;
    }

    @GetMapping
    public List<Claim> getAllClaims(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<String> lossType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lossDateFrom,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate lossDateTo) {

        boolean hasAdvancedFilters = (search != null && !search.isBlank())
                || (lossType != null && !lossType.isEmpty())
                || lossDateFrom != null
                || lossDateTo != null;

        if (hasAdvancedFilters || (status != null && !status.isBlank())) {
            return claimService.searchClaims(
                    status, search, lossType, lossDateFrom, lossDateTo);
        }
        return claimService.getAllClaims();
    }

    @GetMapping("/{id}")
    public Claim getClaimById(@PathVariable Long id) {
        return claimService.getClaimById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Claim createClaim(@RequestBody Map<String, Object> request) {
        return claimService.createClaim(request);
    }

    @PatchMapping("/{id}/status")
    public Claim updateClaimStatus(@PathVariable Long id,
                                   @RequestBody Map<String, String> request,
                                   @RequestHeader(value = "X-User", defaultValue = "system") String user) {
        return claimService.updateClaimStatus(id, request.get("status"), user);
    }

    @GetMapping("/{id}/events")
    public List<ClaimEvent> getClaimEvents(@PathVariable Long id) {
        return claimService.getClaimEvents(id);
    }

    // --- Assignments ---

    @GetMapping("/{id}/assignments")
    public List<Assignment> getAssignments(@PathVariable Long id) {
        return claimService.getClaimAssignments(id);
    }

    @PostMapping("/{id}/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public Assignment createAssignment(@PathVariable Long id,
                                       @RequestBody(required = false) Map<String, Object> request) {
        if (request != null && request.containsKey("adjusterId")) {
            Long adjusterId = Long.valueOf(request.get("adjusterId").toString());
            String notes = (String) request.getOrDefault("notes", null);
            return claimService.manualAssignClaim(id, adjusterId, notes);
        }
        return claimService.autoAssignClaim(id);
    }

    // --- Reserve Decision ---

    @PostMapping("/{id}/reserve-decision")
    public Claim reserveDecision(@PathVariable Long id,
                                 @RequestBody Map<String, Object> request) {
        String decision = (String) request.get("decision");
        BigDecimal amount = request.containsKey("amount")
                ? new BigDecimal(request.get("amount").toString())
                : null;
        return claimService.setReserveDecision(id, decision, amount);
    }

    // --- Documents ---

    @GetMapping("/{id}/documents")
    public List<DocumentMetadata> getDocuments(@PathVariable Long id) {
        return claimService.getClaimDocuments(id);
    }

    @PostMapping("/{id}/documents")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentMetadata addDocument(@PathVariable Long id,
                                        @RequestBody Map<String, String> request) {
        return claimService.addDocument(id, request);
    }

    // --- Payments ---

    @GetMapping("/{id}/payments")
    public List<Payment> getPayments(@PathVariable Long id) {
        return claimService.getClaimPayments(id);
    }

    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public Payment issuePayment(@PathVariable Long id,
                                @RequestBody Map<String, Object> request) {
        return claimService.issuePayment(id, request);
    }

    // --- Notifications ---

    @GetMapping("/{id}/notifications")
    public List<NotificationLog> getNotifications(@PathVariable Long id) {
        return notificationService.getNotificationsForClaim(id);
    }

    // --- Close ---

    @PostMapping("/{id}/close")
    public Claim closeClaim(@PathVariable Long id,
                            @RequestBody(required = false) Map<String, Object> request) {
        boolean subrogation = false;
        if (request != null && request.containsKey("subrogation")) {
            subrogation = Boolean.parseBoolean(request.get("subrogation").toString());
        }
        return claimService.closeClaim(id, subrogation);
    }
}
