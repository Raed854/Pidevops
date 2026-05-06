package MemorIA.entity.community;

import jakarta.persistence.*;

@Entity
@Table(name = "community_bad_words")
public class BadWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "word", nullable = false, unique = true)
    private String word;

    @Column(name = "severity", nullable = false)
    private Integer severity; // 1 = Normal/Mild, 2 = Grave, 3 = Choquant

    public BadWord() {}

    public BadWord(String word, Integer severity) {
        this.word = word;
        this.severity = severity;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getWord() { return word; }
    public void setWord(String word) { this.word = word; }

    public Integer getSeverity() { return severity; }
    public void setSeverity(Integer severity) { this.severity = severity; }
}
