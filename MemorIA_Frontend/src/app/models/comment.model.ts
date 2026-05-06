export interface Comment {
    id?: number;
    content: string;
    authorName: string;
    authorId: number;
    createdAt?: Date;
    publicationId?: number;
    parentId?: number;
    replies?: Comment[];
    isEditing?: boolean;
    newReplyContent?: string;
    showReplies?: boolean;
    showReplyInput?: boolean; 
    showAllReplies?: boolean; 
    showOptions?: boolean; 
    // Reaction UI
    reactionCount?: number;
    showReactionPicker?: boolean;
    myReaction?: string;

    // Moderation UI
    originalContent?: string;
    pendingApproval?: boolean;
    violationSeverity?: number;
}
