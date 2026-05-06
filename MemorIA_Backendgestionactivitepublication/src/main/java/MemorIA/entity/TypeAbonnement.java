package MemorIA.entity;

public enum TypeAbonnement {
    PACK_4(4, 1),
    PACK_15(15, 3),
    PACK_50(50, 12);

    private final int nombreSeances;
    private final int dureeMois;

    TypeAbonnement(int nombreSeances, int dureeMois) {
        this.nombreSeances = nombreSeances;
        this.dureeMois = dureeMois;
    }

    public int getNombreSeances() {
        return nombreSeances;
    }

    public int getDureeMois() {
        return dureeMois;
    }
}
