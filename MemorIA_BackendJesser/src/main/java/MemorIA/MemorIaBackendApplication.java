package MemorIA;

import MemorIA.entity.User;
import MemorIA.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableDiscoveryClient
public class MemorIaBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MemorIaBackendApplication.class, args);
	}

	@Bean
	CommandLineRunner bootstrapAdmin(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			@Value("${app.admin.email}") String adminEmail,
			@Value("${app.admin.password}") String adminPassword
	) {
		return args -> {
			if (userRepository.findByEmail(adminEmail).isPresent()) {
				return;
			}
			User admin = new User();
			admin.setEmail(adminEmail);
			admin.setPassword(passwordEncoder.encode(adminPassword));
			admin.setNom("System");
			admin.setPrenom("Admin");
			admin.setTelephone("00000000");
			admin.setRole("ADMINISTRATEUR");
			admin.setActif(true);
			admin.setProfileCompleted(true);
			userRepository.save(admin);
		};
	}

}
