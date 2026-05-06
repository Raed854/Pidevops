package MemorIA.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Applies a small schema patch needed by the alerts module when running on existing databases.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlertSchemaPatchConfig implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            ensureColumnExists("clinical_note", "ALTER TABLE alerts ADD COLUMN clinical_note VARCHAR(2000) NULL");
            ensureColumnExists("is_critical", "ALTER TABLE alerts ADD COLUMN is_critical TINYINT(1) NOT NULL DEFAULT 0");
            ensureColumnExists("is_escalated", "ALTER TABLE alerts ADD COLUMN is_escalated TINYINT(1) NOT NULL DEFAULT 0");
            ensureColumnExists("gravity_score", "ALTER TABLE alerts ADD COLUMN gravity_score INT NOT NULL DEFAULT 0");
            ensureColumnExists("linked_reminder_id", "ALTER TABLE alerts ADD COLUMN linked_reminder_id BIGINT NULL");
        } catch (Exception ex) {
            // Keep startup alive; this is a compatibility patch and must be non-blocking.
            log.warn("[schema-patch] Could not apply alerts.clinical_note patch: {}", ex.getMessage());
        }
    }

    private void ensureColumnExists(String columnName, String alterSql) {
        Integer columnCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.COLUMNS " +
                        "WHERE TABLE_SCHEMA = DATABASE() " +
                        "AND TABLE_NAME = 'alerts' " +
                        "AND COLUMN_NAME = ?",
                Integer.class,
                columnName
        );

        if (columnCount == null || columnCount == 0) {
            jdbcTemplate.execute(alterSql);
            log.info("[schema-patch] Added missing column alerts.{}", columnName);
        } else {
            log.debug("[schema-patch] Column alerts.{} already exists", columnName);
        }
    }
}
