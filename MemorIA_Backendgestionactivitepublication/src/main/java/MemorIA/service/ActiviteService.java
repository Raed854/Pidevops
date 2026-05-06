package MemorIA.service;

import MemorIA.dto.ActiviteDTO;
import MemorIA.entity.Activite;
import MemorIA.repository.ActiviteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ActiviteService {

    private final ActiviteRepository activiteRepository;
    private final String UPLOAD_DIR = "./uploads/activites";

    public List<ActiviteDTO> getAllActivites() {
        return activiteRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public List<ActiviteDTO> getActivitesBySoignantId(Long soignantId) {
        return activiteRepository.findBySoignantId(soignantId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public Optional<Activite> getActiviteById(Long id) {
        return activiteRepository.findById(id);
    }

    public Activite saveActivite(Activite activite) {
        return activiteRepository.save(activite);
    }

    public void deleteActivite(Long id) {
        activiteRepository.deleteById(id);
    }

    public Activite uploadImage(Long id, MultipartFile file) throws IOException {
        Activite activite = activiteRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Activité non trouvée"));

        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        activite.setImage(fileName);
        return activiteRepository.save(activite);
    }

    public ActiviteDTO toDTO(Activite entity) {
        ActiviteDTO dto = new ActiviteDTO();
        dto.setId(entity.getId());
        dto.setTitre(entity.getTitre());
        dto.setDescription(entity.getDescription());
        dto.setImage(entity.getImage());
        dto.setType(entity.getType());

        if (entity.getSoignant() != null) {
            dto.setDoctorId(entity.getSoignant().getId());
            dto.setDoctor(new ActiviteDTO.DoctorMinDTO(
                    entity.getSoignant().getId(),
                    entity.getSoignant().getNom(),
                    entity.getSoignant().getPrenom()));
        }
        return dto;
    }
}
