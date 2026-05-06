package MemorIA.service;

import MemorIA.dto.PatientDTO;
import MemorIA.dto.PatientListDTO;
import MemorIA.entity.CaregiverLink;
import MemorIA.entity.Patient;
import MemorIA.entity.User;
import MemorIA.repository.AlertRepository;
import MemorIA.repository.CaregiverLinkRepository;
import MemorIA.repository.PatientRepository;
import MemorIA.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements IPatientService {

    private final PatientRepository patientRepository;
    private final UserService userService;
    private final UserRepository userRepository;
    private final CaregiverLinkRepository caregiverLinkRepository;
    private final AlertRepository alertRepository;

    @Override
    public List<PatientDTO> getPatientsByDoctor(Long doctorId) {
        try {
            List<Patient> patients = patientRepository.findByDoctorId(doctorId);
            if (patients == null) {
                patients = List.of();
            }
            return patients.stream()
                    .filter(Objects::nonNull)
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error loading patients for doctor {}: {}", doctorId, e.getMessage(), e);
            throw new RuntimeException("Failed to load patients: " + e.getMessage(), e);
        }
    }

    @Override
    public PatientDTO getPatientById(Long patientId) {
        Patient patient = patientRepository.findById(patientId).orElse(null);
        return patient != null ? convertToDTO(patient) : null;
    }

    @Override
    public List<PatientDTO> searchPatients(String searchTerm, Long doctorId) {
        List<Patient> patients = patientRepository
                .findByNomContainingIgnoreCaseOrPrenomContainingIgnoreCase(searchTerm);

        return patients.stream()
                .filter(p -> p.getUser() != null && Boolean.TRUE.equals(p.getUser().getActif()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<Patient> getByUserId(Long userId) {
        return patientRepository.findByUserId(userId);
    }

    @Override
    public Patient upsertProfile(Long userId, Patient details) {
        User user = userService.getActiveUserForRole(userId, "PATIENT");

        Patient patient = patientRepository.findByUserId(userId).orElseGet(Patient::new);
        patient.setId(userId);
        patient.setUser(user);
        patient.setDateNaissance(details.getDateNaissance());
        patient.setSexe(details.getSexe());
        patient.setNumeroSecuriteSociale(details.getNumeroSecuriteSociale());
        patient.setAdresse(details.getAdresse());
        patient.setVille(details.getVille());
        patient.setGroupeSanguin(details.getGroupeSanguin());
        patient.setMutuelle(details.getMutuelle());
        patient.setNumeroPoliceMutuelle(details.getNumeroPoliceMutuelle());

        try {
            Patient saved = patientRepository.save(patient);
            userService.markProfileCompleted(userId);
            return saved;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid patient profile data. Verify required fields and enum values.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PatientListDTO> getPatientsForCurrentUser() {
        List<Patient> patients;
        try {
            UserContext context = resolveCurrentUserContext();
            log.info("[patients/current-user] loading patients for userId={} role={}", context.userId(), context.role());

            switch (context.role()) {
                case "DOCTOR" -> patients = patientRepository.findByActifTrue();
                case "CAREGIVER" -> patients = getCaregiverPatients(context);
                case "PATIENT" -> patients = patientRepository.findByUserId(context.userId())
                        .map(List::of)
                        .orElse(List.of());
                default -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Unsupported role for patient listing");
            }
        } catch (ResponseStatusException e) {
            log.warn("[patients/current-user] User not authenticated, returning all active patients (fallback)");
            patients = patientRepository.findByActifTrue();
        }

        patients = patients.stream()
                .filter(Objects::nonNull)
                .filter(p -> p.getUser() != null)
                .sorted(Comparator
                        .comparing((Patient p) -> safeLower(p.getUser().getNom()))
                        .thenComparing(p -> safeLower(p.getUser().getPrenom())))
                .toList();

        // If database is empty (for development/testing), return mock data
        if (patients.isEmpty()) {
            log.info("[patients/current-user] Database is empty, returning mock test data for development");
            return returnMockPatients();
        }

        Map<Long, Long> openAlertCountByPatient = loadOpenAlertsCount(patients.stream().map(Patient::getId).toList());

        return patients.stream()
                .map(patient -> toPatientListDTO(patient, openAlertCountByPatient.getOrDefault(patient.getId(), 0L)))
                .toList();
    }

    private List<PatientListDTO> returnMockPatients() {
        return List.of(
            PatientListDTO.builder().id(1L).firstName("Jean").lastName("Martin").age(72).stage("Moderate").adherencePercentage(85.0).numberOfAlerts(2L).initials("JM").build(),
            PatientListDTO.builder().id(2L).firstName("Marie").lastName("Dupont").age(68).stage("Moderate").adherencePercentage(72.0).numberOfAlerts(4L).initials("MD").build(),
            PatientListDTO.builder().id(3L).firstName("Pierre").lastName("Bernard").age(75).stage("Advanced").adherencePercentage(58.0).numberOfAlerts(6L).initials("PB").build(),
            PatientListDTO.builder().id(4L).firstName("Sophie").lastName("Legrand").age(70).stage("Moderate").adherencePercentage(92.0).numberOfAlerts(1L).initials("SL").build(),
            PatientListDTO.builder().id(5L).firstName("Claude").lastName("Renard").age(73).stage("Early").adherencePercentage(88.0).numberOfAlerts(2L).initials("CR").build()
        );
    }

    private List<Patient> getCaregiverPatients(UserContext context) {
        Set<Patient> linkedPatients = new LinkedHashSet<>();

        List<CaregiverLink> links = caregiverLinkRepository.findAcceptedByCaregiverUser(context.userId(), context.email());
        for (CaregiverLink link : links) {
            if (link != null && link.getPatient() != null) {
                linkedPatients.add(link.getPatient());
            }
        }

        if (linkedPatients.isEmpty()) {
            linkedPatients.addAll(patientRepository.findAllByAccompagnantUserId(context.userId()));
        }

        if (linkedPatients.isEmpty()) {
            linkedPatients.addAll(patientRepository.findAllByAccompagnantId(context.userId()));
        }

        return new ArrayList<>(linkedPatients);
    }

    private Map<Long, Long> loadOpenAlertsCount(Collection<Long> patientIds) {
        if (patientIds == null || patientIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Long> counter = new HashMap<>();
        List<Object[]> rows = alertRepository.countOpenAlertsByPatientIds(patientIds);
        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            Long patientId = toLong(row[0]);
            Long count = toLong(row[1]);
            if (patientId != null && count != null) {
                counter.put(patientId, count);
            }
        }
        return counter;
    }

    private PatientListDTO toPatientListDTO(Patient patient, Long numberOfAlerts) {
        User user = patient.getUser();
        String firstName = user.getPrenom();
        String lastName = user.getNom();
        int age = computeAge(patient.getDateNaissance());
        double adherence = patient.getAdherenceRate() != null ? patient.getAdherenceRate() : 0d;

        return PatientListDTO.builder()
                .id(patient.getId())
                .firstName(firstName)
                .lastName(lastName)
                .age(age)
                .stage(deriveStage(adherence))
                .adherencePercentage(adherence)
                .photoUrl(null)
                .initials(buildInitials(firstName, lastName))
                .numberOfAlerts(numberOfAlerts != null ? numberOfAlerts : 0L)
                .build();
    }

    private int computeAge(LocalDate birthDate) {
        if (birthDate == null) {
            return 0;
        }
        return Math.max(0, Period.between(birthDate, LocalDate.now()).getYears());
    }

    private String deriveStage(double adherence) {
        if (adherence >= 80) {
            return "Early";
        }
        if (adherence >= 60) {
            return "Moderate";
        }
        return "Advanced";
    }

    private String buildInitials(String firstName, String lastName) {
        StringBuilder initials = new StringBuilder();
        if (firstName != null && !firstName.isBlank()) {
            initials.append(firstName.trim().charAt(0));
        }
        if (lastName != null && !lastName.isBlank()) {
            initials.append(lastName.trim().charAt(0));
        }
        return initials.length() > 0 ? initials.toString().toUpperCase(Locale.ROOT) : "PT";
    }

    private String safeLower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private UserContext resolveCurrentUserContext() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }

        Long userId = null;
        String role = null;
        String email = null;

        Object principal = authentication.getPrincipal();

        if (principal instanceof User userPrincipal) {
            userId = userPrincipal.getId();
            role = normalizeRole(userPrincipal.getRole());
            email = userPrincipal.getEmail();
        } else if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername();
        } else if (principal instanceof String principalText && !principalText.isBlank()) {
            email = principalText;
        }

        if (userId == null && email != null && !email.isBlank()) {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                userId = byEmail.get().getId();
                if (role == null || role.isBlank()) {
                    role = normalizeRole(byEmail.get().getRole());
                }
                email = byEmail.get().getEmail();
            }
        }

        if ((role == null || role.isBlank()) && authentication.getAuthorities() != null) {
            role = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .map(this::normalizeRole)
                    .filter(r -> !r.isBlank())
                    .findFirst()
                    .orElse("");
        }

        if ((role == null || role.isBlank()) && userId != null) {
            role = userRepository.findById(userId).map(User::getRole).map(this::normalizeRole).orElse("");
        }

        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user id not found");
        }

        if (role.isBlank()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated role not supported");
        }

        if (email == null || email.isBlank()) {
            email = userRepository.findById(userId).map(User::getEmail).orElse("");
        }

        return new UserContext(userId, role, email);
    }

    private String normalizeRole(String rawRole) {
        if (rawRole == null) {
            return "";
        }

        String role = rawRole.trim().toUpperCase(Locale.ROOT).replace("[", "").replace("]", "");
        String[] tokens = role.split("[,;\\s]+");

        for (String token : tokens) {
            String normalized = token;
            while (normalized.startsWith("ROLE_")) {
                normalized = normalized.substring(5);
            }

            if ("DOCTOR".equals(normalized) || "SOIGNANT".equals(normalized) || "MEDECIN".equals(normalized)) {
                return "DOCTOR";
            }
            if ("CAREGIVER".equals(normalized) || "ACCOMPAGNANT".equals(normalized) || "AIDANT".equals(normalized)) {
                return "CAREGIVER";
            }
            if ("PATIENT".equals(normalized)) {
                return "PATIENT";
            }
        }
        return "";
    }

    private PatientDTO convertToDTO(Patient patient) {
        PatientDTO dto = new PatientDTO();
        dto.setId(patient.getId());

        User user = patient.getUser();
        if (user != null) {
            dto.setNom(user.getNom());
            dto.setPrenom(user.getPrenom());
            dto.setActif(user.getActif() != null ? user.getActif() : true);
        } else {
            dto.setActif(true);
        }

        if (patient.getDateNaissance() != null) {
            dto.setAge(Period.between(patient.getDateNaissance(), LocalDate.now()).getYears());
        }

        StringBuilder initials = new StringBuilder();
        if (user != null && user.getPrenom() != null && !user.getPrenom().isEmpty()) {
            initials.append(user.getPrenom().charAt(0));
        }
        if (user != null && user.getNom() != null && !user.getNom().isEmpty()) {
            initials.append(user.getNom().charAt(0));
        }
        dto.setInitials(initials.toString().toUpperCase());

        dto.setAdherenceRate(patient.getAdherenceRate() != null ? patient.getAdherenceRate() : 0.0);
        dto.setStage(MemorIA.entity.AlzheimerStage.LEGER);

        return dto;
    }

    private record UserContext(Long userId, String role, String email) {}
}

