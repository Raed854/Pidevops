package MemorIA.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendAccountConfirmation(String toEmail, String fullName) {
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
    }
}
