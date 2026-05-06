package MemorIA.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prenom", nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("prenom")
    private String firstName;
    
    @Column(name = "nom", nullable = false)
    @com.fasterxml.jackson.annotation.JsonProperty("nom")
    private String lastName;

    @Column(nullable = false, unique = true)
    private String email;
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "actif", nullable = false)
    @Builder.Default
    private boolean enabled = true;
    
    @Column(nullable = false, columnDefinition = "varchar(255) default ''")
    @Builder.Default
    private String telephone = "";

    @Column(name = "profile_completed", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean profileCompleted = false;

    @com.fasterxml.jackson.annotation.JsonProperty("name")
    public String getName() {
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }

    // Additional JSON aliases so the frontend can read either prenom/nom or firstName/lastName.
    @com.fasterxml.jackson.annotation.JsonProperty("firstName")
    public String getFirstNameJson() {
        return firstName;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("lastName")
    public String getLastNameJson() {
        return lastName;
    }
}