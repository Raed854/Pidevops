package MemorIA.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendSubscriptionConfirmation(String toEmail, String userName, String planType, String receiptPdfPath) {
        try {
            String planLabel = getPlanLabel(planType);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("noreply@memoria.com");
            helper.setTo(toEmail);
            helper.setSubject("✅ Abonnement MemorIA activé - " + planLabel);

            String htmlContent = """
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fc; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #6c63ff 0%%, #4a42d4 100%%); padding: 32px; text-align: center;">
                        <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 Bienvenue sur MemorIA !</h1>
                    </div>
                    <div style="padding: 32px;">
                        <p style="font-size: 16px; color: #333;">Bonjour <strong>%s</strong>,</p>
                        <p style="font-size: 15px; color: #555; line-height: 1.6;">
                            Votre abonnement <strong>%s</strong> a été activé avec succès.
                            Vous avez désormais accès à toutes les fonctionnalités de la communauté MemorIA.
                        </p>
                        <div style="background: #fff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e8e8f0;">
                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #7c7c8d;">Plan actif</p>
                            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #6c63ff;">%s</p>
                        </div>
                        <p style="font-size: 13px; color: #999; line-height: 1.5;">
                            Votre reçu de paiement est joint à cet email au format PDF.
                        </p>
                    </div>
                    <div style="background: #f0f0f5; padding: 16px; text-align: center;">
                        <p style="margin: 0; font-size: 12px; color: #999;">MemorIA - Plateforme de soins connectés</p>
                    </div>
                </div>
                """.formatted(userName, planLabel, planLabel);

            helper.setText(htmlContent, true);

            // Attach local receipt PDF file
            if (receiptPdfPath != null && !receiptPdfPath.isEmpty()) {
                try {
                    java.io.File pdfFile = new java.io.File(receiptPdfPath);
                    if (pdfFile.exists()) {
                        helper.addAttachment("recu-memoria.pdf",
                                new ByteArrayResource(java.nio.file.Files.readAllBytes(pdfFile.toPath())),
                                "application/pdf");
                    }
                } catch (Exception e) {
                    System.err.println("Could not attach receipt PDF: " + e.getMessage());
                }
            }

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send confirmation email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String getPlanLabel(String planType) {
        return switch (planType) {
            case "WEEKLY" -> "Hebdomadaire";
            case "MONTHLY" -> "Mensuel";
            case "YEARLY" -> "Annuel";
            default -> planType;
        };
    }
}
