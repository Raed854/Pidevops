package com.med.cognitive.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "mot5_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Mot5Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "mots5_test_id")
    private Mots5Test mots5Test;

    @Column(name = "word")
    private String word;

    @Column(name = "category")
    private String category;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "rappel_libre")
    private Boolean rappelLibre = false;

    @Column(name = "rappel_indice")
    private Boolean rappelIndice = false;

    @Column(name = "score")
    private Integer score = 0;
}
