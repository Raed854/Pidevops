package MemorIA.service;

import MemorIA.entity.community.BadWord;
import MemorIA.repository.BadWordRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Iterator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class BadWordService {

    private final BadWordRepository badWordRepository;

    public BadWordService(BadWordRepository badWordRepository) {
        this.badWordRepository = badWordRepository;
    }

    public static class BadWordAnalysis {
        public boolean hasBadWords;
        public int maxSeverity;
        public String maskedText;

        public BadWordAnalysis(boolean hasBadWords, int maxSeverity, String maskedText) {
            this.hasBadWords = hasBadWords;
            this.maxSeverity = maxSeverity;
            this.maskedText = maskedText;
        }
    }

    @Transactional
    public void importFromExcel(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            int count = 0;
            while (rows.hasNext()) {
                Row currentRow = rows.next();
                // Skip header
                if (count == 0) {
                    count++;
                    continue;
                }

                if (currentRow.getCell(0) == null) continue;

                String word = currentRow.getCell(0).getStringCellValue().trim().toLowerCase();
                int severity = 1; // Default
                if (currentRow.getCell(1) != null) {
                    severity = (int) currentRow.getCell(1).getNumericCellValue();
                }

                if (!word.isEmpty()) {
                    boolean exists = badWordRepository.findByWordIgnoreCase(word).isPresent();
                    if (!exists) {
                        badWordRepository.save(new BadWord(word, severity));
                    }
                }
            }
        }
    }

    public BadWordAnalysis analyze(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new BadWordAnalysis(false, 0, text);
        }

        List<BadWord> allBadWords = badWordRepository.findAll();
        String maskedText = text;
        int maxSeverity = 0;
        boolean hasBadWords = false;

        for (BadWord bw : allBadWords) {
            String wordPattern = "(?i)\\b" + Pattern.quote(bw.getWord()) + "\\b";
            Pattern p = Pattern.compile(wordPattern);
            Matcher m = p.matcher(maskedText);

            if (m.find()) {
                hasBadWords = true;
                if (bw.getSeverity() > maxSeverity) {
                    maxSeverity = bw.getSeverity();
                }
                maskedText = m.replaceAll("***");
            }
        }

        return new BadWordAnalysis(hasBadWords, maxSeverity, maskedText);
    }
}
