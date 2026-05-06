package MemorIA.controller;

/**
 * Version ultra-compatible sans Lombok pour éviter les soucis de compilation.
 */
public class ReactionRequest {
    private Long userId;
    private String type;

    public ReactionRequest() {}

    public ReactionRequest(Long userId, String type) {
        this.userId = userId;
        this.type = type;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
