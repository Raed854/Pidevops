package MemorIA.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TimelinePointDTO {
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;
    private Double rate;
}