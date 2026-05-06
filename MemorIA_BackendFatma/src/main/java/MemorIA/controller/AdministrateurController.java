package MemorIA.controller;

import MemorIA.entity.Administrateur;
import MemorIA.service.AdministrateurService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/administrateurs")
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class AdministrateurController {

    private final AdministrateurService service;

    public AdministrateurController(AdministrateurService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Administrateur>> getAll(){return ResponseEntity.ok(service.getAll());}

    @GetMapping("/{id}")
    public ResponseEntity<Administrateur> getById(@PathVariable Long id){
        return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Administrateur> create(@Valid @RequestBody Administrateur a){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(a));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Administrateur> update(@PathVariable Long id, @Valid @RequestBody Administrateur a){
        try{return ResponseEntity.ok(service.update(id,a));}catch(RuntimeException e){return ResponseEntity.notFound().build();}
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){service.delete(id); return ResponseEntity.noContent().build();}
}
