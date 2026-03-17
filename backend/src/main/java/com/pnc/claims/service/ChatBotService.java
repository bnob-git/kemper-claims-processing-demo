package com.pnc.claims.service;

import com.pnc.claims.controller.ChatResponse;
import com.pnc.claims.entity.Claim;
import com.pnc.claims.entity.Policy;
import com.pnc.claims.repository.ClaimRepository;
import com.pnc.claims.repository.PolicyRepository;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatBotService {

    private final ClaimRepository claimRepository;
    private final PolicyRepository policyRepository;

    private static final Pattern CLAIM_NUM =
            Pattern.compile("CLM-[A-Z0-9]{8}", Pattern.CASE_INSENSITIVE);
    private static final Pattern POLICY_NUM =
            Pattern.compile("POL-\\d{3}", Pattern.CASE_INSENSITIVE);

    public ChatBotService(ClaimRepository claimRepository,
                          PolicyRepository policyRepository) {
        this.claimRepository = claimRepository;
        this.policyRepository = policyRepository;
    }

    public ChatResponse processMessage(String message) {
        if (message == null || message.isBlank()) {
            return fallback();
        }
        String lower = message.toLowerCase();

        ChatResponse resp = tryClaimLookup(message, lower);
        if (resp != null) return resp;

        resp = tryPolicyLookup(message, lower);
        if (resp != null) return resp;

        resp = tryListClaims(lower);
        if (resp != null) return resp;

        resp = tryWorkflowHelp(lower);
        if (resp != null) return resp;

        resp = tryNavigation(lower);
        if (resp != null) return resp;

        return fallback();
    }

    private ChatResponse tryClaimLookup(String raw, String lower) {
        Matcher m = CLAIM_NUM.matcher(raw);
        if (!m.find() && !lower.contains("claim status")) {
            return null;
        }
        if (m.find(0)) {
            return lookupByClaimNumber(m.group().toUpperCase());
        }
        return null;
    }

    private ChatResponse lookupByClaimNumber(String claimNumber) {
        Optional<Claim> opt = claimRepository.findByClaimNumber(claimNumber);
        if (opt.isEmpty()) {
            return new ChatResponse(
                "I couldn't find a claim with number " + claimNumber + ".",
                null,
                Arrays.asList("Show my claims", "How to file a claim")
            );
        }
        Claim c = opt.get();
        String reply = buildClaimReply(c);
        return new ChatResponse(reply, c,
            Arrays.asList("Show my claims", "How to file a claim"));
    }

    private String buildClaimReply(Claim c) {
        StringBuilder sb = new StringBuilder();
        sb.append("Claim ").append(c.getClaimNumber());
        sb.append(" — Status: ").append(c.getStatus());
        if (c.getReserveAmount() != null) {
            sb.append(", Reserve: $").append(c.getReserveAmount());
        }
        sb.append(", Loss Type: ").append(c.getLossType());
        sb.append(", Severity: ").append(c.getSeverityScore());
        return sb.toString();
    }

    private ChatResponse tryPolicyLookup(String raw, String lower) {
        Matcher m = POLICY_NUM.matcher(raw);
        if (!m.find()) {
            return null;
        }
        String policyNum = m.group().toUpperCase();
        List<Policy> all = policyRepository.findAll();
        Optional<Policy> opt = all.stream()
            .filter(p -> p.getPolicyNumber().equalsIgnoreCase(policyNum))
            .findFirst();
        if (opt.isEmpty()) {
            return new ChatResponse(
                "I couldn't find policy " + policyNum + ".",
                null,
                Arrays.asList("Show my claims", "Go to dashboard")
            );
        }
        Policy p = opt.get();
        String reply = buildPolicyReply(p);
        return new ChatResponse(reply, p,
            Arrays.asList("Show my claims", "Go to dashboard"));
    }

    private String buildPolicyReply(Policy p) {
        StringBuilder sb = new StringBuilder();
        sb.append("Policy ").append(p.getPolicyNumber());
        sb.append(" — Holder: ").append(p.getHolderName());
        sb.append(", Vehicle: ").append(p.getVehicleYear());
        sb.append(" ").append(p.getVehicleMake());
        sb.append(" ").append(p.getVehicleModel());
        sb.append(", Coverage: ").append(p.getCoverageType());
        return sb.toString();
    }

    private ChatResponse tryListClaims(String lower) {
        if (!containsAny(lower, "show my claims", "open claims",
                "list claims", "my claims")) {
            return null;
        }
        List<Claim> claims = resolveClaimList(lower);
        String reply = formatClaimList(claims);
        return new ChatResponse(reply, null,
            Arrays.asList("How to file a claim", "Go to dashboard"));
    }

    private List<Claim> resolveClaimList(String lower) {
        if (lower.contains("open")) {
            return claimRepository.findByStatus("OPEN");
        } else if (lower.contains("settled")) {
            return claimRepository.findByStatus("SETTLED");
        } else if (lower.contains("closed")) {
            return claimRepository.findByStatus("CLOSED");
        }
        return claimRepository.findAll();
    }

    private String formatClaimList(List<Claim> claims) {
        if (claims.isEmpty()) {
            return "No claims found.";
        }
        StringBuilder sb = new StringBuilder("Found " + claims.size()
                + " claim(s):\n");
        for (Claim c : claims) {
            sb.append("• ").append(c.getClaimNumber());
            sb.append(" [").append(c.getStatus()).append("] — ");
            sb.append(c.getLossType()).append("\n");
        }
        return sb.toString();
    }

    private ChatResponse tryWorkflowHelp(String lower) {
        if (containsAny(lower, "how to file", "new claim", "fnol")) {
            return fnolHelp();
        }
        if (containsAny(lower, "triage", "assign")) {
            return triageHelp();
        }
        if (containsAny(lower, "settlement", "payment")) {
            return settlementHelp();
        }
        return null;
    }

    private ChatResponse fnolHelp() {
        return new ChatResponse(
            "To file a new claim, go to /fnol and fill in the loss "
                + "details including policy, loss type, date, and "
                + "description. The claim will be created in OPEN status.",
            null,
            Arrays.asList("Go to new claim", "Show my claims")
        );
    }

    private ChatResponse triageHelp() {
        return new ChatResponse(
            "During triage, claims are reviewed and assigned to "
                + "adjusters. Auto-assignment uses rules based on loss "
                + "type and severity. You can also manually assign.",
            null,
            Arrays.asList("Show my claims", "Go to dashboard")
        );
    }

    private ChatResponse settlementHelp() {
        return new ChatResponse(
            "After investigation, a reserve is set and then a "
                + "settlement payment is issued. Once paid, the claim "
                + "can be closed with an optional subrogation flag.",
            null,
            Arrays.asList("Show my claims", "Go to dashboard")
        );
    }

    private ChatResponse tryNavigation(String lower) {
        if (containsAny(lower, "go to dashboard", "show dashboard")) {
            return new ChatResponse(
                "Navigating to the dashboard.",
                null,
                Arrays.asList("Show my claims", "How to file a claim")
            );
        }
        if (containsAny(lower, "go to new claim", "go to fnol")) {
            return new ChatResponse(
                "Navigating to the new claim form.",
                null,
                Arrays.asList("Show my claims", "Go to dashboard")
            );
        }
        return null;
    }

    private ChatResponse fallback() {
        return new ChatResponse(
            "I'm the Claims Assistant. I can help you with:\n"
                + "• Look up a claim (e.g. \"CLM-A1B2C3D4\")\n"
                + "• Look up a policy (e.g. \"POL-001\")\n"
                + "• List claims (\"show my claims\")\n"
                + "• Workflow help (\"how to file a claim\")\n"
                + "• Navigation (\"go to dashboard\")",
            null,
            Arrays.asList("Show my claims", "How to file a claim",
                "Go to dashboard")
        );
    }

    private boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }
}
