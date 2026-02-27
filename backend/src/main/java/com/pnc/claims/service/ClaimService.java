package com.pnc.claims.service;

import com.pnc.claims.entity.*;
import com.pnc.claims.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ClaimService {

    private final ClaimRepository claimRepository;
    private final PolicyRepository policyRepository;
    private final ClaimEventRepository claimEventRepository;
    private final AssignmentRepository assignmentRepository;
    private final DocumentMetadataRepository documentMetadataRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    private static final String STATUS_OPEN = "OPEN";

    public ClaimService(ClaimRepository claimRepository,
                        PolicyRepository policyRepository,
                        ClaimEventRepository claimEventRepository,
                        AssignmentRepository assignmentRepository,
                        DocumentMetadataRepository documentMetadataRepository,
                        PaymentRepository paymentRepository,
                        UserRepository userRepository) {
        this.claimRepository = claimRepository;
        this.policyRepository = policyRepository;
        this.claimEventRepository = claimEventRepository;
        this.assignmentRepository = assignmentRepository;
        this.documentMetadataRepository = documentMetadataRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
    }

    public List<Claim> getAllClaims() {
        return claimRepository.findAll();
    }

    public List<Claim> getClaimsByStatus(String status) {
        return claimRepository.findByStatus(status);
    }

    public Claim getClaimById(Long id) {
        return claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found: " + id));
    }

    @Transactional
    public Claim createClaim(Map<String, Object> request) {
        Long policyId = Long.valueOf(request.get("policyId").toString());
        Policy policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new RuntimeException("Policy not found: " + policyId));

        Claim claim = new Claim();
        claim.setClaimNumber("CLM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        claim.setPolicy(policy);
        claim.setStatus(STATUS_OPEN);
        claim.setLossType((String) request.get("lossType"));
        claim.setSeverityScore(Integer.valueOf(request.get("severityScore").toString()));
        claim.setLossDate(LocalDate.parse((String) request.get("lossDate")));
        claim.setLossDescription((String) request.get("lossDescription"));
        claim.setReportedDate(LocalDate.now());
        claim.setClaimantName((String) request.get("claimantName"));
        claim.setClaimantPhone((String) request.get("claimantPhone"));
        claim.setSubrogationFlag(false);

        Claim saved = claimRepository.save(claim);

        ClaimEvent event = new ClaimEvent();
        event.setClaimId(saved.getId());
        event.setEventType("STATUS_CHANGE");
        event.setNewStatus(STATUS_OPEN);
        event.setNotes("FNOL submitted");
        event.setCreatedBy("system");
        claimEventRepository.save(event);

        return saved;
    }

    @Transactional
    public Claim updateClaimStatus(Long claimId, String newStatus, String user) {
        Claim claim = getClaimById(claimId);
        String oldStatus = claim.getStatus();
        claim.setStatus(newStatus);
        Claim saved = claimRepository.save(claim);

        ClaimEvent event = new ClaimEvent();
        event.setClaimId(claimId);
        event.setEventType("STATUS_CHANGE");
        event.setOldStatus(oldStatus);
        event.setNewStatus(newStatus);
        event.setNotes("Status changed from " + oldStatus + " to " + newStatus);
        event.setCreatedBy(user);
        claimEventRepository.save(event);

        return saved;
    }

    /**
     * Auto-assign a claim based on triage rules.
     *
     * Rules:
     * - COLLISION with severity >= 7 → SENIOR_ADJUSTER
     * - THEFT (any severity) → SENIOR_ADJUSTER
     * - Everything else → ADJUSTER
     */
    @Transactional
    public Assignment autoAssignClaim(Long claimId) {
        Claim claim = getClaimById(claimId);

        String requiredRole;
        String reason;

        if ("COLLISION".equals(claim.getLossType()) && claim.getSeverityScore() >= 7) {
            requiredRole = "SENIOR_ADJUSTER";
            reason = "Collision with severity >= 7";
        } else if ("THEFT".equals(claim.getLossType())) {
            requiredRole = "SENIOR_ADJUSTER";
            reason = "Theft claim";
        } else {
            requiredRole = "ADJUSTER";
            reason = "Standard assignment";
        }

        List<AppUser> candidates = userRepository.findByRole(requiredRole);
        if (candidates.isEmpty()) {
            candidates = userRepository.findByRole("ADJUSTER");
        }
        AppUser adjuster = candidates.get(0);

        Assignment assignment = new Assignment();
        assignment.setClaimId(claimId);
        assignment.setAdjusterId(adjuster.getId());
        assignment.setAssignedDate(LocalDate.now());
        assignment.setAssignmentType("AUTO");
        assignment.setNotes("Auto-assigned: " + reason + " → " + adjuster.getFullName());

        return assignmentRepository.save(assignment);
    }

    @Transactional
    public Assignment manualAssignClaim(Long claimId, Long adjusterId, String notes) {
        getClaimById(claimId);
        AppUser adjuster = userRepository.findById(adjusterId)
                .orElseThrow(() -> new RuntimeException("User not found: " + adjusterId));

        Assignment assignment = new Assignment();
        assignment.setClaimId(claimId);
        assignment.setAdjusterId(adjuster.getId());
        assignment.setAssignedDate(LocalDate.now());
        assignment.setAssignmentType("MANUAL");
        assignment.setNotes(notes != null ? notes : "Manually assigned to " + adjuster.getFullName());

        return assignmentRepository.save(assignment);
    }

    /**
     * Calculate and set reserve for a claim.
     */
    @Transactional
    public Claim setReserveDecision(Long claimId, String decision, BigDecimal requestedAmount) {
        Claim claim = getClaimById(claimId);

        if ("APPROVE".equalsIgnoreCase(decision)) {
            BigDecimal reserveAmount = requestedAmount != null
                    ? requestedAmount : calculateReserveAmount(claim);
            claim.setReserveAmount(reserveAmount);
            claim.setStatus("RESERVE_SET");
            logEvent(claimId, "UNDER_INVESTIGATION", "RESERVE_SET", "Reserve approved: $" + reserveAmount);
        } else {
            claim.setStatus("DENIED");
            logEvent(claimId, claim.getStatus(), "DENIED", "Reserve denied");
        }

        return claimRepository.save(claim);
    }

    private BigDecimal calculateReserveAmount(Claim claim) {
        BigDecimal baseAmount = new BigDecimal("1000");
        BigDecimal severityMultiplier = BigDecimal.valueOf(claim.getSeverityScore());
        BigDecimal adjustmentFactor = new BigDecimal("1.15");
        return severityMultiplier.multiply(baseAmount).multiply(adjustmentFactor);
    }

    private void logEvent(Long claimId, String oldStatus, String newStatus, String notes) {
        ClaimEvent event = new ClaimEvent();
        event.setClaimId(claimId);
        event.setEventType("STATUS_CHANGE");
        event.setOldStatus(oldStatus);
        event.setNewStatus(newStatus);
        event.setNotes(notes);
        event.setCreatedBy("system");
        claimEventRepository.save(event);
    }

    @Transactional
    public DocumentMetadata addDocument(Long claimId, Map<String, String> request) {
        getClaimById(claimId);

        DocumentMetadata doc = new DocumentMetadata();
        doc.setClaimId(claimId);
        doc.setFileName(request.get("fileName"));
        doc.setDocumentType(request.get("documentType"));
        doc.setUploadedBy(request.get("uploadedBy"));
        doc.setNotes(request.get("notes"));

        return documentMetadataRepository.save(doc);
    }

    @Transactional
    public Payment issuePayment(Long claimId, Map<String, Object> request) {
        Claim claim = getClaimById(claimId);

        BigDecimal amount = new BigDecimal(request.get("amount").toString());
        claim.setSettlementAmount(amount);
        claim.setStatus("SETTLED");
        claimRepository.save(claim);

        Payment payment = new Payment();
        payment.setClaimId(claimId);
        payment.setAmount(amount);
        payment.setPaymentType("SETTLEMENT");
        payment.setPaymentDate(LocalDate.now());
        payment.setReferenceNumber("PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payment.setStatus("COMPLETED");
        payment.setCreatedBy((String) request.getOrDefault("createdBy", "system"));

        ClaimEvent event = new ClaimEvent();
        event.setClaimId(claimId);
        event.setEventType("STATUS_CHANGE");
        event.setOldStatus("RESERVE_SET");
        event.setNewStatus("SETTLED");
        event.setNotes("Payment issued: $" + amount);
        event.setCreatedBy("system");
        claimEventRepository.save(event);

        return paymentRepository.save(payment);
    }

    @Transactional
    public Claim closeClaim(Long claimId, boolean subrogation) {
        Claim claim = getClaimById(claimId);
        claim.setStatus("CLOSED");
        claim.setSubrogationFlag(subrogation);

        ClaimEvent event = new ClaimEvent();
        event.setClaimId(claimId);
        event.setEventType("STATUS_CHANGE");
        event.setOldStatus("SETTLED");
        event.setNewStatus("CLOSED");
        event.setNotes("Claim closed" + (subrogation ? " with subrogation" : ""));
        event.setCreatedBy("system");
        claimEventRepository.save(event);

        return claimRepository.save(claim);
    }

    public List<ClaimEvent> getClaimEvents(Long claimId) {
        return claimEventRepository.findByClaimIdOrderByCreatedAtAsc(claimId);
    }

    public List<Assignment> getClaimAssignments(Long claimId) {
        return assignmentRepository.findByClaimId(claimId);
    }

    public List<DocumentMetadata> getClaimDocuments(Long claimId) {
        return documentMetadataRepository.findByClaimId(claimId);
    }

    public List<Payment> getClaimPayments(Long claimId) {
        return paymentRepository.findByClaimId(claimId);
    }
}
