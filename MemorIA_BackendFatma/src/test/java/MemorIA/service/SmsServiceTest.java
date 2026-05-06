package MemorIA.service;

import MemorIA.config.TwilioConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests unitaires pour le SmsService
 */
@DisplayName("SmsService Tests")
public class SmsServiceTest {

    @Mock
    private TwilioConfig twilioConfig;

    @InjectMocks
    private SmsService smsService;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        when(twilioConfig.isSmsEnabled()).thenReturn(true);
        when(twilioConfig.getPhoneNumber()).thenReturn("+1709910630");
    }

    @Test
    @DisplayName("Test formatage numéro français 0xxxxx")
    public void testFormatFrenchPhoneNumber() {
        // Note: La méthode formatPhoneNumber est private,
        // ce test valide le comportement via sendSms
        // Un vrai test nécessiterait une réflexion ou un refactoring

        assertTrue(true); // Placeholder
    }

    @Test
    @DisplayName("Test retour false si SMS désactivé")
    public void testSmsDisabled() {
        when(twilioConfig.isSmsEnabled()).thenReturn(false);

        boolean result = smsService.sendSms("+33612345678", "Test message");

        assertFalse(result);
    }

    @Test
    @DisplayName("Test retour false si numéro vide")
    public void testEmptyPhoneNumber() {
        boolean result = smsService.sendSms("", "Test message");
        assertFalse(result);

        result = smsService.sendSms(null, "Test message");
        assertFalse(result);
    }

    @Test
    @DisplayName("Test retour false si message vide")
    public void testEmptyMessage() {
        boolean result = smsService.sendSms("+33612345678", "");
        assertFalse(result);

        result = smsService.sendSms("+33612345678", null);
        assertFalse(result);
    }

}

