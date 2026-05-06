package MemorIA.dto;

public class ActiviteDTO {
    private Long id;
    private String titre;
    private String description;
    private String image;
    private String type;
    private Long doctorId;
    private DoctorMinDTO doctor;

    public ActiviteDTO() {}

    public ActiviteDTO(Long id, String titre, String description, String image, String type, Long doctorId, DoctorMinDTO doctor) {
        this.id = id;
        this.titre = titre;
        this.description = description;
        this.image = image;
        this.type = type;
        this.doctorId = doctorId;
        this.doctor = doctor;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }
    public DoctorMinDTO getDoctor() { return doctor; }
    public void setDoctor(DoctorMinDTO doctor) { this.doctor = doctor; }

    public static class DoctorMinDTO {
        private Long id;
        private String nom;
        private String prenom;

        public DoctorMinDTO() {}
        public DoctorMinDTO(Long id, String nom, String prenom) {
            this.id = id;
            this.nom = nom;
            this.prenom = prenom;
        }
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }
        public String getPrenom() { return prenom; }
        public void setPrenom(String prenom) { this.prenom = prenom; }
    }
}
