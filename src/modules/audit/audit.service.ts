import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuditLogParams {
  userId: string;
  action: string;      // VD: 'CREATE_USER', 'UPDATE_STORE'
  entity: string;      // VD: 'User', 'Store'
  entityId?: string;   // ID của đối tượng bị tác động
  detail?: object;     // Chi tiết thay đổi (JSON)
}

export const logAction = async (params: AuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        detail: params.detail || {},
      },
    });
    // Không cần await hoặc log success để tránh block main thread quá lâu
    // trừ khi transaction yêu cầu chặt chẽ.
  } catch (error) {
    console.error('❌ Failed to write audit log:', error);
    // Tùy nghiệp vụ: Có thể throw error để rollback transaction chính
  }
};