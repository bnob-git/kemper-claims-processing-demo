-- Users (adjusters)
INSERT INTO app_user (id, username, full_name, role, email) VALUES
(1, 'jsmith', 'John Smith', 'SENIOR_ADJUSTER', 'john.smith@pnc-insurance.com'),
(2, 'mwilliams', 'Maria Williams', 'ADJUSTER', 'maria.williams@pnc-insurance.com'),
(3, 'rjohnson', 'Robert Johnson', 'SENIOR_ADJUSTER', 'robert.johnson@pnc-insurance.com');

-- Policies
INSERT INTO policy (id, policy_number, holder_name, holder_email, vehicle_vin, vehicle_year, vehicle_make, vehicle_model, coverage_type, effective_date, expiration_date) VALUES
(1, 'POL-2024-00101', 'Alice Henderson', 'alice.h@email.com', '1HGBH41JXMN109186', 2021, 'Honda', 'Civic', 'COMPREHENSIVE', '2024-01-01', '2025-01-01'),
(2, 'POL-2024-00202', 'Brian Carter', 'brian.c@email.com', '2T1BURHE5JC123456', 2022, 'Toyota', 'Corolla', 'COLLISION', '2024-03-15', '2025-03-15'),
(3, 'POL-2024-00303', 'Carol Davis', 'carol.d@email.com', '5YJSA1DG9DFP14705', 2023, 'Tesla', 'Model S', 'COMPREHENSIVE', '2024-06-01', '2025-06-01'),
(4, 'POL-2024-00404', 'David Evans', 'david.e@email.com', 'WBAPH5C55BA271848', 2020, 'BMW', '328i', 'LIABILITY', '2024-02-01', '2025-02-01'),
(5, 'POL-2024-00505', 'Eva Foster', 'eva.f@email.com', '1FADP3F29JL234567', 2019, 'Ford', 'Focus', 'COLLISION', '2024-04-01', '2025-04-01');

-- Claims
INSERT INTO claim (id, claim_number, policy_id, status, loss_type, severity_score, loss_date, loss_description, reported_date, claimant_name, claimant_phone, reserve_amount, settlement_amount, subrogation_flag, created_at, updated_at) VALUES
(1, 'CLM-2024-0001', 1, 'OPEN', 'COLLISION', 7, '2024-09-10', 'Rear-end collision at intersection of Main St and 5th Ave. Other driver ran red light.', '2024-09-10', 'Alice Henderson', '555-0101', NULL, NULL, false, '2024-09-10T10:30:00', '2024-09-10T10:30:00'),
(2, 'CLM-2024-0002', 2, 'UNDER_INVESTIGATION', 'THEFT', 9, '2024-09-12', 'Vehicle stolen from parking garage overnight. Police report filed #PR-44521.', '2024-09-13', 'Brian Carter', '555-0202', 15000.00, NULL, false, '2024-09-13T08:00:00', '2024-09-14T09:00:00'),
(3, 'CLM-2024-0003', 3, 'RESERVE_SET', 'COLLISION', 5, '2024-09-15', 'Minor fender bender in parking lot. Low speed impact, cosmetic damage to rear bumper.', '2024-09-15', 'Carol Davis', '555-0303', 3200.00, NULL, false, '2024-09-15T14:00:00', '2024-09-16T11:00:00'),
(4, 'CLM-2024-0004', 4, 'SETTLED', 'WEATHER', 4, '2024-09-08', 'Hail damage to roof and hood during severe storm on Sept 8th.', '2024-09-09', 'David Evans', '555-0404', 2800.00, 2650.00, false, '2024-09-09T07:30:00', '2024-09-20T16:00:00'),
(5, 'CLM-2024-0005', 5, 'CLOSED', 'COLLISION', 8, '2024-09-01', 'T-bone collision at uncontrolled intersection. Significant passenger side damage. Third party at fault.', '2024-09-01', 'Eva Foster', '555-0505', 12000.00, 11500.00, true, '2024-09-01T11:00:00', '2024-09-25T10:00:00');

-- Assignments
INSERT INTO assignment (id, claim_id, adjuster_id, assigned_date, assignment_type, notes) VALUES
(1, 1, 2, '2024-09-10', 'AUTO', 'Auto-assigned: Collision, severity 7 → Senior Adjuster threshold not met'),
(2, 2, 1, '2024-09-13', 'AUTO', 'Auto-assigned: Theft, severity 9 → Senior Adjuster'),
(3, 3, 2, '2024-09-15', 'AUTO', 'Auto-assigned: Collision, severity 5 → Adjuster'),
(4, 4, 3, '2024-09-09', 'MANUAL', 'Manually assigned to Robert for weather claims expertise'),
(5, 5, 1, '2024-09-01', 'AUTO', 'Auto-assigned: Collision, severity 8 → Senior Adjuster');

-- Claim Events (status history)
INSERT INTO claim_event (id, claim_id, event_type, old_status, new_status, notes, created_by, created_at) VALUES
(1, 1, 'STATUS_CHANGE', NULL, 'OPEN', 'FNOL submitted', 'system', '2024-09-10T10:30:00'),
(2, 2, 'STATUS_CHANGE', NULL, 'OPEN', 'FNOL submitted', 'system', '2024-09-13T08:00:00'),
(3, 2, 'STATUS_CHANGE', 'OPEN', 'UNDER_INVESTIGATION', 'Investigation started - theft case', 'jsmith', '2024-09-14T09:00:00'),
(4, 3, 'STATUS_CHANGE', NULL, 'OPEN', 'FNOL submitted', 'system', '2024-09-15T14:00:00'),
(5, 3, 'STATUS_CHANGE', 'OPEN', 'RESERVE_SET', 'Reserve approved at $3,200', 'mwilliams', '2024-09-16T11:00:00'),
(6, 4, 'STATUS_CHANGE', NULL, 'OPEN', 'FNOL submitted', 'system', '2024-09-09T07:30:00'),
(7, 4, 'STATUS_CHANGE', 'OPEN', 'SETTLED', 'Settlement approved and payment issued', 'rjohnson', '2024-09-20T16:00:00'),
(8, 5, 'STATUS_CHANGE', NULL, 'OPEN', 'FNOL submitted', 'system', '2024-09-01T11:00:00'),
(9, 5, 'STATUS_CHANGE', 'OPEN', 'SETTLED', 'Settlement processed', 'jsmith', '2024-09-22T10:00:00'),
(10, 5, 'STATUS_CHANGE', 'SETTLED', 'CLOSED', 'Claim closed with subrogation flag', 'jsmith', '2024-09-25T10:00:00');

-- Document Metadata
INSERT INTO document_metadata (id, claim_id, file_name, document_type, uploaded_by, uploaded_at, notes) VALUES
(1, 1, 'police_report_CLM0001.pdf', 'POLICE_REPORT', 'alice.h@email.com', '2024-09-10T11:00:00', 'Initial police report'),
(2, 2, 'police_report_CLM0002.pdf', 'POLICE_REPORT', 'brian.c@email.com', '2024-09-13T09:00:00', 'Theft police report #PR-44521'),
(3, 2, 'surveillance_footage.mp4', 'EVIDENCE', 'jsmith', '2024-09-14T10:00:00', 'Parking garage camera footage'),
(4, 3, 'damage_photos_CLM0003.zip', 'PHOTO', 'carol.d@email.com', '2024-09-15T15:00:00', 'Bumper damage photos'),
(5, 5, 'repair_estimate_CLM0005.pdf', 'ESTIMATE', 'jsmith', '2024-09-05T09:00:00', 'Body shop repair estimate');

-- Payments
INSERT INTO payment (id, claim_id, amount, payment_type, payment_date, reference_number, status, created_by) VALUES
(1, 4, 2650.00, 'SETTLEMENT', '2024-09-20', 'PAY-2024-0401', 'COMPLETED', 'rjohnson'),
(2, 5, 11500.00, 'SETTLEMENT', '2024-09-22', 'PAY-2024-0501', 'COMPLETED', 'jsmith');

-- Reset identity sequences past seed data
ALTER TABLE app_user ALTER COLUMN id RESTART WITH 100;
ALTER TABLE policy ALTER COLUMN id RESTART WITH 100;
ALTER TABLE claim ALTER COLUMN id RESTART WITH 100;
ALTER TABLE assignment ALTER COLUMN id RESTART WITH 100;
ALTER TABLE claim_event ALTER COLUMN id RESTART WITH 100;
ALTER TABLE document_metadata ALTER COLUMN id RESTART WITH 100;
ALTER TABLE payment ALTER COLUMN id RESTART WITH 100;
