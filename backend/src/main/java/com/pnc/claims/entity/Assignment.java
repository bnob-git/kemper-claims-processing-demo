package com.pnc.claims.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "assignment")
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "claim_id", nullable = false)
    private Long claimId;

    @Column(name = "adjuster_id", nullable = false)
    private Long adjusterId;

    private LocalDate assignedDate;

    @Column(nullable = false)
    private String assignmentType;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "adjuster_id", insertable = false, updatable = false)
    private AppUser adjuster;

    public Assignment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getClaimId() { return claimId; }
    public void setClaimId(Long claimId) { this.claimId = claimId; }

    public Long getAdjusterId() { return adjusterId; }
    public void setAdjusterId(Long adjusterId) { this.adjusterId = adjusterId; }

    public LocalDate getAssignedDate() { return assignedDate; }
    public void setAssignedDate(LocalDate assignedDate) { this.assignedDate = assignedDate; }

    public String getAssignmentType() { return assignmentType; }
    public void setAssignmentType(String assignmentType) { this.assignmentType = assignmentType; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public AppUser getAdjuster() { return adjuster; }
    public void setAdjuster(AppUser adjuster) { this.adjuster = adjuster; }
}
