-- ============================================
-- MIGRATION DATA FROM OLD ENTITIES TO NEW USERS TABLE
-- ============================================
-- IMPORTANT: This script should be run after the Spring Boot application
-- has created the users table via JPA/Hibernate on first startup

-- Step 1: Disable foreign key constraints temporarily
SET FOREIGN_KEY_CHECKS=0;

-- Step 2: Backup old data (optional - for safety)
-- These tables can be dropped after verification
-- CREATE TABLE patients_backup AS SELECT * FROM patients;
-- CREATE TABLE soignants_backup AS SELECT * FROM soignants;
-- CREATE TABLE accompagnants_backup AS SELECT * FROM accompagnants;

-- Step 3: Migrate Patients from old table
INSERT INTO users (id, nom, prenom, email, telephone, role, actif, adresse, date_naissance, sexe, soignant_id, profile_completed, password)
SELECT p.id, p.nom, p.prenom, p.email, p.telephone, 'PATIENT', p.actif, p.adresse, p.date_naissance, p.sexe, p.soignant_id, false, 'Patient@1234'
FROM patients p
WHERE p.id NOT IN (SELECT id FROM users WHERE role = 'PATIENT')
ON DUPLICATE KEY UPDATE 
  nom = VALUES(nom), 
  prenom = VALUES(prenom), 
  password = 'Patient@1234';

-- Step 4: Migrate Soignants from old table
INSERT INTO users (id, nom, prenom, email, telephone, role, actif, adresse, specialite, matricule, profile_completed, password)
SELECT s.id, s.nom, s.prenom, s.email, s.telephone, 'SOIGNANT', s.actif, '', s.specialite, s.matricule, false, 'Soignant@1234'
FROM soignants s
WHERE s.id NOT IN (SELECT id FROM users WHERE role = 'SOIGNANT')
ON DUPLICATE KEY UPDATE 
  nom = VALUES(nom), 
  prenom = VALUES(prenom), 
  password = 'Soignant@1234';

-- Step 5: Migrate Accompagnants from old table
INSERT INTO users (id, nom, prenom, email, telephone, role, actif, adresse, patient_id, relation, profile_completed, password)
SELECT a.id, a.nom, a.prenom, a.email, a.telephone, 'AIDANT', a.actif, '', a.patient_id, a.relation, false, 'Aidant@1234'
FROM accompagnants a
WHERE a.id NOT IN (SELECT id FROM users WHERE role = 'AIDANT')
ON DUPLICATE KEY UPDATE 
  nom = VALUES(nom), 
  prenom = VALUES(prenom), 
  password = 'Aidant@1234';

-- ============================================
-- STEP 6: ADD TEST DATA FOR DEMONSTRATION
-- ============================================

-- Test Soignants (Doctors)
INSERT INTO users (nom, prenom, email, telephone, role, actif, adresse, specialite, matricule, profile_completed, password)
VALUES 
  ('Dupont', 'Jean', 'jeandupont@memoria.com', '0612345678', 'SOIGNANT', true, '123 Rue de la Santé, Paris', 'Neurologie', 'MAT001', false, 'Med123!Pass'),
  ('Martin', 'Marie', 'mariemartin@memoria.com', '0687654321', 'SOIGNANT', true, '456 Avenue Gambetta, Lyon', 'Gériatrie', 'MAT002', false, 'Doc456!Pass')
ON DUPLICATE KEY UPDATE 
  actif = VALUES(actif),
  password = VALUES(password);

-- Test Patients
INSERT INTO users (nom, prenom, email, telephone, role, actif, adresse, date_naissance, sexe, soignant_id, profile_completed, password)
VALUES 
  ('Lefevre', 'Claude', 'claudelefevre@memoria.com', '0611223344', 'PATIENT', true, '42 Rue de Lyon, Paris', '1948-05-15', 'M', 1, false, 'Pat123!Pass'),
  ('Moreau', 'Jeannine', 'jeanninmoreau@memoria.com', '0622334455', 'PATIENT', true, '15 Avenue des Champs, Lyon', '1952-03-22', 'F', 2, false, 'Pat456!Pass'),
  ('Renard', 'Robert', 'robertrenard@memoria.com', '0633445566', 'PATIENT', true, '8 Boulevard Victor, Marseille', '1945-11-10', 'M', 1, false, 'Pat789!Pass')
ON DUPLICATE KEY UPDATE 
  actif = VALUES(actif),
  password = VALUES(password),
  soignant_id = VALUES(soignant_id);

-- Test Aidants (Caregivers)
INSERT INTO users (nom, prenom, email, telephone, role, actif, adresse, patient_id, relation, profile_completed, password)
VALUES 
  ('Dupont', 'Pierre', 'pierredupont@memoria.com', '0699886677', 'AIDANT', true, '42 Rue de Lyon, Paris', 3, 'FILS', false, 'Aid123!Pass'),
  ('Martin', 'Sophie', 'sophiemartin@memoria.com', '0655443322', 'AIDANT', true, '15 Avenue des Champs, Lyon', 4, 'EPOUSE', false, 'Aid456!Pass'),
  ('Lefevre', 'Luc', 'luclefevre@memoria.com', '0644332211', 'AIDANT', true, '8 Boulevard Victor, Marseille', 5, 'FILS', false, 'Aid789!Pass')
ON DUPLICATE KEY UPDATE 
  actif = VALUES(actif),
  password = VALUES(password);

-- Re-enable foreign key constraints
SET FOREIGN_KEY_CHECKS=1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- SELECT COUNT(*) as total_users, role, COUNT(DISTINCT role) FROM users GROUP BY role;
-- SELECT * FROM users WHERE role = 'SOIGNANT';
-- SELECT * FROM users WHERE role = 'PATIENT';
-- SELECT * FROM users WHERE role = 'AIDANT';

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. All test users have simple passwords (e.g., 'Med123!Pass')
-- 2. Users MUST change passwords on first login (productionImpl)
-- 3. After running this script, you can start the application
-- 4. The old tables (patients, soignants, accompagnants) can be kept for 
--    historical reference or dropped after verification
-- 5. Update the soignant_id and patient_id values based on your actual IDs
-- ============================================
