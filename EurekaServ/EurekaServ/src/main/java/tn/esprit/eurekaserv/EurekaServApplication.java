package tn.esprit.eurekaserv;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@EnableEurekaServer
@SpringBootApplication
public class EurekaServApplication {

    public static void main(String[] args) {
        SpringApplication.run(EurekaServApplication.class, args);
    }

}
