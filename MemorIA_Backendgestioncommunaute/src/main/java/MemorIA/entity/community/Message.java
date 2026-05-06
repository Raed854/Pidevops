package MemorIA.entity.community;

import MemorIA.entity.User;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 2000)
    private String content;

    /** Image or Generic file path (relative) */
    private String imageUrl;
    private String fileUrl;
    private String fileType;

    /** Tags for categorization (comma-separated or JSON style string) */
    @Column(length = 500)
    private String tags;

    @ManyToOne(fetch = FetchType.EAGER)
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    private Conversation conversation;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;

    private boolean isRead;

    /** Soft delete - message hidden but kept for history */
    private boolean isDeleted;

    private boolean isEdited;

    /**
     * If this message was forwarded, reference original (lazy to avoid circular
     * serialize)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    private Message forwardedFrom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnore
    private Message replyTo;
}