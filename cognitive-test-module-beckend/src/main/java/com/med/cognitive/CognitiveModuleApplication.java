package com.med.cognitive;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableDiscoveryClient
@EnableScheduling
@SpringBootApplication(exclude = {
        // We build datasources manually (PostgresDataSourceConfig + MySqlDataSourceConfig).
        // HibernateJpaAutoConfiguration stays enabled — we need its EntityManagerFactoryBuilder.
        DataSourceAutoConfiguration.class
})
public class CognitiveModuleApplication {

	public static void main(String[] args) {
		try {
			SpringApplication.run(CognitiveModuleApplication.class, args);
		} catch (Exception e) {
			e.printStackTrace();
			System.err.println("FATAL ERROR: " + e.getMessage());
			throw e;
		}
	}

}
