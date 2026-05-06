package MemorIA.repository;

import MemorIA.entity.Administrateur;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

public interface AdministrateurRepository extends JpaRepository<Administrateur, Long> {


}
