import { Types } from 'mongoose';
import { Conversation } from '../../database/models/Conversation.model';
import { ForbiddenError, ValidationError } from '../../shared/errors/AppError';

/** True when a direct conversation has no other distinct member (self-chat). */
export function isSelfDirectConversation(
  type: string,
  memberIds: Array<string | Types.ObjectId>,
  currentUserId: string,
): boolean {
  if (type !== 'direct') return false;
  const ids = [...new Set(memberIds.map(String))];
  return ids.length < 2 || ids.every((id) => id === currentUserId);
}

/**
 * Rejects self-chat conversations for any access path (REST or socket).
 */
export async function assertNotSelfConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!Types.ObjectId.isValid(conversationId)) return;
  const convo = await Conversation.findById(conversationId).select('type memberIds').lean();
  if (!convo) return;
  if (isSelfDirectConversation(convo.type, convo.memberIds, userId)) {
    throw new ForbiddenError('Self-chat is not allowed', { code: 'SELF_CHAT_NOT_ALLOWED' });
  }
}

/** Normalize member list for create — strips self duplicates and rejects empty peers for direct. */
export function sanitizeMemberIdsForCreate(
  type: 'direct' | 'group',
  currentUserId: string,
  rawMemberIds: string[],
): string[] {
  const others = [...new Set(rawMemberIds.map(String))].filter((id) => id && id !== currentUserId);

  if (type === 'direct') {
    if (others.length === 0) {
      throw new ValidationError('You cannot start a chat with yourself', 'SELF_CHAT_NOT_ALLOWED');
    }
    if (others.length > 1) {
      throw new ValidationError('Direct chats require exactly one other member', 'INVALID_DIRECT_MEMBERS');
    }
  }

  if (others.length === 0) {
    throw new ValidationError('A conversation needs at least one other member', 'INVALID_MEMBERS');
  }

  return [currentUserId, ...others];
}
