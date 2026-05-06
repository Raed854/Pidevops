-- Database initialization script for MemoriA
-- This script creates the chat_messages table if it doesn't exist

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    sender_user_id BIGINT NOT NULL,
    content VARCHAR(2000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_chat_patient (patient_id),
    INDEX idx_chat_sender (sender_user_id),
    INDEX idx_chat_created (created_at)
);
