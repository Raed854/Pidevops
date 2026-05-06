package MemorIA.entity.community;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "publications_system")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Publication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String doctorName;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    private String mediaUrl;
    private String mediaType;
    private String fileName;

    @Enumerated(EnumType.STRING)
    private PublicationType type;

    private String eventLink;
    private String eventAddress;

    private LocalDateTime createdAt = LocalDateTime.now();
    
    // We can just store doctorId if we need to link it later, but string is requested.
    @OneToMany(mappedBy = "publication", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private java.util.List<Comment> comments = new java.util.ArrayList<>();
    
    private Long doctorId;

    public String getEventLink() { return eventLink; }
    public void setEventLink(String eventLink) { this.eventLink = eventLink; }
    public String getEventAddress() { return eventAddress; }
    public void setEventAddress(String eventAddress) { this.eventAddress = eventAddress; }
}
