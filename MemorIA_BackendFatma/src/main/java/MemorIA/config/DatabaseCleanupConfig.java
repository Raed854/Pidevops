package MemorIA.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.logging.Logger;

/**
 * Database cleanup configuration for truly orphaned legacy tables.
 * Must not drop active application tables.
 */
@Configuration
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseCleanupConfig {
    private static final Logger logger = Logger.getLogger(DatabaseCleanupConfig.class.getName());

    /**
     * InitializingBean ensures this runs during Spring context initialization
     * before any entity scanning or Hibernate session factory creation
     */
    @Bean(name = "alerteTableCleanup")
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public InitializingBean cleanupOrphanedTables(DataSource dataSource) {
        return () -> {
            logger.info("[DatabaseCleanup] Checking legacy orphan tables...");

            if (dataSource == null) {
                logger.warning("⚠️  [DatabaseCleanup] DataSource is null - skipping cleanup");
                return;
            }

            try (Connection conn = dataSource.getConnection()) {
                if (conn == null) {
                    logger.warning("⚠️  [DatabaseCleanup] Failed to get database connection");
                    return;
                }

                // Never drop active alert tables. Only optional legacy artifacts can be cleaned.
                dropTableIfExists(conn, "notifications_alertes_legacy");

                logger.info("[DatabaseCleanup] Cleanup completed successfully");
            } catch (Exception e) {
                logger.warning("⚠️  [DatabaseCleanup] Error during cleanup (non-critical): " + e.getMessage());
                e.printStackTrace();
                // Don't rethrow - this shouldn't prevent app startup
            }
        };
    }

    /**
     * Drops a table if it exists. Uses IF EXISTS to prevent errors.
     *
     * @param conn Database connection
     * @param tableName Table name to drop
     */
    private void dropTableIfExists(Connection conn, String tableName) {
        try (Statement stmt = conn.createStatement()) {
            // Use backticks for MySQL table names - no CASCADE needed for MySQL
            String sql = "DROP TABLE IF EXISTS `" + tableName + "`";
            stmt.executeUpdate(sql);
            logger.info("✅ [DatabaseCleanup] Successfully dropped orphaned table: " + tableName);
        } catch (Exception e) {
            logger.fine("ℹ️  [DatabaseCleanup] Table '" + tableName + "' does not exist or already dropped: " + e.getMessage());
        }
    }
}
