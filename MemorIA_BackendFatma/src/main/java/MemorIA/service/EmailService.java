package MemorIA.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendAccountConfirmation(String toEmail, String fullName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(toEmail);
            message.setSubject("MemorIA - Account Confirmation");
            message.setText(
                    "Hello " + fullName + ",\n\n" +
                    "Your account has been approved by the administrator. " +
                    "You can now log in to MemorIA.\n\n" +
                    "Regards,\nMemorIA Team"
            );
            mailSender.send(message);
            logger.info("Account confirmation email sent to: {}", toEmail);
        } catch (Exception e) {
            logger.warn("Failed to send account confirmation email to {}: {}", toEmail, e.getMessage());
            // Don't throw exception - email is optional for now
        }
    }
}
