package MemorIA.entity.community;

import MemorIA.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "communities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Community {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private boolean isPrivate;
    private boolean isBlocked;
    private boolean isArchived;

    /** Tags for categorization */
    @Column(length = 500)
    private String tags;

    @ManyToOne(fetch = FetchType.EAGER)
    private User createdBy;

    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "community_members", joinColumns = @JoinColumn(name = "community_id"), inverseJoinColumns = @JoinColumn(name = "user_id"))
    private Set<User> members = new HashSet<>();
}