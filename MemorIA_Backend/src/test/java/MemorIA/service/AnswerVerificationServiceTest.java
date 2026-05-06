package MemorIA.service;

import MemorIA.entity.diagnostic.Question;
import MemorIA.entity.diagnostic.QuestionType;
import MemorIA.entity.diagnostic.Reponse;
import MemorIA.repository.ReponseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnswerVerificationServiceTest {

    @Mock
    private ReponseRepository reponseRepository;

    @InjectMocks
    private AnswerVerificationService verificationService;

    private Question textQuestion;

    @BeforeEach
    void setUp() {
        textQuestion = new Question();
        textQuestion.setId(1L);
        textQuestion.setType(QuestionType.TEXT);
        textQuestion.setQuestionText("Capitale de la France ?");
    }

    private Reponse correctReponse(String text) {
        Reponse r = new Reponse();
        r.setReponseText(text);
        r.setReponse(true);
        return r;
    }

    @Test
    @DisplayName("verifyAnswer: returns 0.0 for null or blank patient response")
    void verifyAnswer_zeroOnEmpty() {
        assertEquals(0.0, verificationService.verifyAnswer(textQuestion, null));
        assertEquals(0.0, verificationService.verifyAnswer(textQuestion, "   "));
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): exact match against predefined answer scores 5.0")
    void verifyAnswer_textExactMatch() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(correctReponse("Paris")));

        Double score = verificationService.verifyAnswer(textQuestion, "Paris");

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): match is case- and accent-insensitive")
    void verifyAnswer_textIgnoresCaseAndAccents() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(correctReponse("Élève")));

        Double score = verificationService.verifyAnswer(textQuestion, "  ELEVE!  ");

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): containment match scores 5.0")
    void verifyAnswer_textContainmentMatch() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(correctReponse("Paris")));

        Double score = verificationService.verifyAnswer(textQuestion, "C'est Paris bien sur");

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): similarity >= 80% scores 5.0 (typo tolerance)")
    void verifyAnswer_textSimilarityMatch() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(correctReponse("Marseille")));

        // "Marseile" — one missing letter, similarity ~89%
        Double score = verificationService.verifyAnswer(textQuestion, "Marseile");

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): unrelated answer scores 0.0")
    void verifyAnswer_textNoMatch() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(correctReponse("Paris")));

        Double score = verificationService.verifyAnswer(textQuestion, "Berlin");

        assertEquals(0.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): returns null when no predefined answers exist")
    void verifyAnswer_textReturnsNullWithoutPredefined() {
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of());

        Double score = verificationService.verifyAnswer(textQuestion, "Anything");

        assertNull(score);
    }

    @Test
    @DisplayName("verifyAnswer (TEXT): falls back to all answers when none flagged correct")
    void verifyAnswer_textFallsBackWhenNoneCorrect() {
        Reponse onlyOption = new Reponse();
        onlyOption.setReponseText("Paris");
        onlyOption.setReponse(false);
        when(reponseRepository.findByQuestionId(1L)).thenReturn(List.of(onlyOption));

        Double score = verificationService.verifyAnswer(textQuestion, "Paris");

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (DATE_CHECK): correct day-only response scores 5.0")
    void verifyAnswer_dateDayOnly() {
        Question q = new Question();
        q.setId(2L);
        q.setType(QuestionType.DATE_CHECK);

        int today = LocalDate.now().getDayOfMonth();
        Double score = verificationService.verifyAnswer(q, String.valueOf(today));

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (DATE_CHECK): wrong day scores 0.0")
    void verifyAnswer_dateWrongDay() {
        Question q = new Question();
        q.setId(2L);
        q.setType(QuestionType.DATE_CHECK);

        int wrongDay = LocalDate.now().getDayOfMonth() == 15 ? 16 : 15;
        Double score = verificationService.verifyAnswer(q, String.valueOf(wrongDay));

        assertEquals(0.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (DATE_CHECK): full DD/MM/YYYY format works")
    void verifyAnswer_dateFullFormat() {
        Question q = new Question();
        q.setId(2L);
        q.setType(QuestionType.DATE_CHECK);

        LocalDate today = LocalDate.now();
        String formatted = String.format("%02d/%02d/%d",
                today.getDayOfMonth(), today.getMonthValue(), today.getYear());

        Double score = verificationService.verifyAnswer(q, formatted);

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (DATE_CHECK): non-numeric input scores 0.0")
    void verifyAnswer_dateInvalidInput() {
        Question q = new Question();
        q.setId(2L);
        q.setType(QuestionType.DATE_CHECK);

        Double score = verificationService.verifyAnswer(q, "abcdef");

        assertEquals(0.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (DAY_CHECK): current day name scores 5.0")
    void verifyAnswer_dayCurrent() {
        Question q = new Question();
        q.setId(3L);
        q.setType(QuestionType.DAY_CHECK);

        String day = LocalDate.now().getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.FRENCH);
        Double score = verificationService.verifyAnswer(q, day);

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (DAY_CHECK): wrong day scores 0.0")
    void verifyAnswer_dayWrong() {
        Question q = new Question();
        q.setId(3L);
        q.setType(QuestionType.DAY_CHECK);

        String currentDay = LocalDate.now().getDayOfWeek()
                .getDisplayName(TextStyle.FULL, Locale.FRENCH);
        // Find another day name that is sufficiently different
        String wrongDay = "lundi".equalsIgnoreCase(currentDay) ? "Vendredi" : "Lundi";

        Double score = verificationService.verifyAnswer(q, wrongDay);

        assertEquals(0.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (MONTH_CHECK): current month name scores 5.0")
    void verifyAnswer_monthCurrent() {
        Question q = new Question();
        q.setId(4L);
        q.setType(QuestionType.MONTH_CHECK);

        String month = LocalDate.now().getMonth().getDisplayName(TextStyle.FULL, Locale.FRENCH);
        Double score = verificationService.verifyAnswer(q, month);

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (YEAR_CHECK): current year scores 5.0")
    void verifyAnswer_yearCurrent() {
        Question q = new Question();
        q.setId(5L);
        q.setType(QuestionType.YEAR_CHECK);

        int year = LocalDate.now().getYear();
        Double score = verificationService.verifyAnswer(q, String.valueOf(year));

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (YEAR_CHECK): two-digit format expanded to 21st century")
    void verifyAnswer_yearTwoDigits() {
        Question q = new Question();
        q.setId(5L);
        q.setType(QuestionType.YEAR_CHECK);

        int year = LocalDate.now().getYear();
        int twoDigits = year - 2000;
        Double score = verificationService.verifyAnswer(q, String.valueOf(twoDigits));

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (YEAR_CHECK): wrong year scores 0.0")
    void verifyAnswer_yearWrong() {
        Question q = new Question();
        q.setId(5L);
        q.setType(QuestionType.YEAR_CHECK);

        Double score = verificationService.verifyAnswer(q, "1999");

        assertEquals(0.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (SEASON_CHECK): correct season scores 5.0")
    void verifyAnswer_seasonCorrect() {
        Question q = new Question();
        q.setId(6L);
        q.setType(QuestionType.SEASON_CHECK);

        int month = LocalDate.now().getMonthValue();
        String currentSeason;
        if (month >= 3 && month <= 5)        currentSeason = "printemps";
        else if (month >= 6 && month <= 8)   currentSeason = "été";
        else if (month >= 9 && month <= 11)  currentSeason = "automne";
        else                                  currentSeason = "hiver";

        Double score = verificationService.verifyAnswer(q, currentSeason);

        assertEquals(5.0, score);
    }

    @Test
    @DisplayName("verifyAnswer (SEASON_CHECK): wrong season scores 0.0")
    void verifyAnswer_seasonWrong() {
        Question q = new Question();
        q.setId(6L);
        q.setType(QuestionType.SEASON_CHECK);

        // Always-wrong choice: pick a season different from the current one.
        int month = LocalDate.now().getMonthValue();
        String wrong = (month >= 6 && month <= 8) ? "hiver" : "été";

        Double score = verificationService.verifyAnswer(q, wrong);

        assertEquals(0.0, score);
    }
}
