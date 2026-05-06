package MemorIA.controller;

import MemorIA.entity.Accompagnant;
import MemorIA.service.AccompagnantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accompagnants")
public class AccompagnantController {

    private final AccompagnantService service;

    public AccompagnantController(AccompagnantService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<Accompagnant>> getAll(){return ResponseEntity.ok(service.getAll());}

    @GetMapping("/{id}")
    public ResponseEntity<Accompagnant> getById(@PathVariable Long id){
        return service.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<Accompagnant> getProfileByUserId(@PathVariable Long userId){
        return service.getById(userId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Accompagnant> create(@Valid @RequestBody Accompagnant a){
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(a));
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<Accompagnant> upsertProfile(@PathVariable Long userId, @Valid @RequestBody Accompagnant a){
        return ResponseEntity.ok(service.upsertProfile(userId, a));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Accompagnant> update(@PathVariable Long id, @Valid @RequestBody Accompagnant a){
        try{return ResponseEntity.ok(service.update(id,a));}catch(RuntimeException e){return ResponseEntity.notFound().build();}
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){service.delete(id); return ResponseEntity.noContent().build();}
}
