package MemorIA.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import MemorIA.entity.role.GroupeSanguin;

/**
 * Converter for GroupeSanguin enum.
 * Handles empty strings and invalid enum values in the database by converting them to null.
 */
@Converter(autoApply = true)
public class StringToEnumConverter implements AttributeConverter<GroupeSanguin, String> {

    @Override
    public String convertToDatabaseColumn(GroupeSanguin attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public GroupeSanguin convertToEntityAttribute(String dbData) {
        // Convert empty string or whitespace to null
        if (dbData == null || dbData.trim().isEmpty()) {
            return null;
        }
        try {
            return GroupeSanguin.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            // If value doesn't match enum, return null instead of throwing
            return null;
        }
    }
}
