package com.pnc.claims.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim")
public class Claim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String claimNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "policy_id", nullable = false)
    private Policy policy;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String lossType;

    private Integer severityScore;

    private LocalDate lossDate;

    @Column(length = 2000)
    private String lossDescription;

    private LocalDate reportedDate;

    private String claimantName;
    private String claimantPhone;

    @Column(precision = 12, scale = 2)
    private BigDecimal reserveAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal settlementAmount;

    private Boolean subrogationFlag;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Claim() {}

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getClaimNumber() { return claimNumber; }
    public void setClaimNumber(String claimNumber) { this.claimNumber = claimNumber; }

    public Policy getPolicy() { return policy; }
    public void setPolicy(Policy policy) { this.policy = policy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLossType() { return lossType; }
    public void setLossType(String lossType) { this.lossType = lossType; }

    public Integer getSeverityScore() { return severityScore; }
    public void setSeverityScore(Integer severityScore) { this.severityScore = severityScore; }

    public LocalDate getLossDate() { return lossDate; }
    public void setLossDate(LocalDate lossDate) { this.lossDate = lossDate; }

    public String getLossDescription() { return lossDescription; }
    public void setLossDescription(String lossDescription) { this.lossDescription = lossDescription; }

    public LocalDate getReportedDate() { return reportedDate; }
    public void setReportedDate(LocalDate reportedDate) { this.reportedDate = reportedDate; }

    public String getClaimantName() { return claimantName; }
    public void setClaimantName(String claimantName) { this.claimantName = claimantName; }

    public String getClaimantPhone() { return claimantPhone; }
    public void setClaimantPhone(String claimantPhone) { this.claimantPhone = claimantPhone; }

    public BigDecimal getReserveAmount() { return reserveAmount; }
    public void setReserveAmount(BigDecimal reserveAmount) { this.reserveAmount = reserveAmount; }

    public BigDecimal getSettlementAmount() { return settlementAmount; }
    public void setSettlementAmount(BigDecimal settlementAmount) { this.settlementAmount = settlementAmount; }

    public Boolean getSubrogationFlag() { return subrogationFlag; }
    public void setSubrogationFlag(Boolean subrogationFlag) { this.subrogationFlag = subrogationFlag; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
