package MemorIA.dto;

import lombok.Data;

@Data
public class CategoryStatsDTO {
    private String type;
    private Double rate;
    private Integer completed;
    private Integer total;
}