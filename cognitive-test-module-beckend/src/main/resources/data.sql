-- ============================================
-- INITIALIZATION SCRIPT - AUTO-RUN ON STARTUP
-- PostgreSQL Version - Test Data Only
-- ============================================

-- Insert Test Data - Soignants (Doctors)
INSERT INTO users (nom, prenom, email, telephone, role, actif, adresse, specialite, matricule, profile_completed, password)
VALUES 
  ('Dupont', 'Jean', 'jeandupont@memoria.com', '0612345678', 'SOIGNANT', true, '123 Rue de la Santé, Paris', 'Neurologie', 'MAT001', false, 'Med123!Pass'),
  ('Martin', 'Marie', 'mariemartin@memoria.com', '0687654321', 'SOIGNANT', true, '456 Avenue Gambetta, Lyon', 'Gériatrie', 'MAT002', false, 'Doc456!Pass')
ON CONFLICT (email) DO NOTHING;

-- Insert Test Data - Patients (without soignant_id for now)
INSERT INTO users (nom, prenom, email, telephone, role, actif, adresse, date_naissance, sexe, profile_completed, password)
VALUES 
  ('Lefevre', 'Claude', 'claudelefevre@memoria.com', '0611223344', 'PATIENT', true, '42 Rue de Lyon, Paris', '1948-05-15', 'M', false, 'Pat123!Pass'),
  ('Moreau', 'Jeannine', 'jeanninmoreau@memoria.com', '0622334455', 'PATIENT', true, '15 Avenue des Champs, Lyon', '1952-03-22', 'F', false, 'Pat456!Pass'),
  ('Renard', 'Robert', 'robertrenard@memoria.com', '0633445566', 'PATIENT', true, '8 Boulevard Victor, Marseille', '1945-11-10', 'M', false, 'Pat789!Pass')
ON CONFLICT (email) DO NOTHING;

-- Insert Test Data - Aidants (Caregivers)
INSERT INTO users (nom, prenom, email, telephone, role, actif, adresse, relation, profile_completed, password)
VALUES 
  ('Dupont', 'Pierre', 'pierredupont@memoria.com', '0699886677', 'AIDANT', true, '42 Rue de Lyon, Paris', 'FILS', false, 'Aid123!Pass'),
  ('Martin', 'Sophie', 'sophiemartin@memoria.com', '0655443322', 'AIDANT', true, '15 Avenue des Champs, Lyon', 'EPOUSE', false, 'Aid456!Pass'),
  ('Lefevre', 'Luc', 'luclefevre@memoria.com', '0644332211', 'AIDANT', true, '8 Boulevard Victor, Marseille', 'FILS', false, 'Aid789!Pass')
ON CONFLICT (email) DO NOTHING;
