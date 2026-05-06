export enum PublicationType {
    INFORMATION = 'INFORMATION',
    EVENEMENT = 'EVENEMENT',
    CONSEIL = 'CONSEIL',
    AUTRE = 'AUTRE'
}

export interface Publication {
    id?: number;
    doctorName?: string;
    title: string;
    content: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    type: PublicationType | string;
    eventLink?: string;
    eventAddress?: string;
    safeMapUrl?: any; // To store pre-computed safe URLs for iframes
    createdAt?: string;
    doctorId?: number;
    // UI Only properties for Reactions
    showReplyInput?: boolean; 
    showAllReplies?: boolean; 
    showOptions?: boolean;
    // Reaction UI
    reactionCount?: number;
    showReactionPicker?: boolean;
    myReaction?: string;
    
    // Rating UI
    averageRating?: number;
    ratingCount?: number;
    myRating?: number;
}
