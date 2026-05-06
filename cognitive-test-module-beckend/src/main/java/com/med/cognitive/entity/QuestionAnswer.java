package com.med.cognitive.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "question_answers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuestionAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private TestQuestion question;

    @Column(name = "answer_text", nullable = false)
    private String answerText;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_correct", nullable = false)
    private Boolean isCorrect = false;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "score")
    private Integer score = 0;
}
