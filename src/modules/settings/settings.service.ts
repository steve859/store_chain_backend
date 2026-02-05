import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SettingItem {
  key: string;
  value: string;
  type?: string;   // <-- Thêm type
  group?: string;
  description?: string;
}

export const SettingsService = {
  // 1. Lấy toàn bộ
  getAllSettings: async () => {
    return prisma.systemSetting.findMany({
      orderBy: { group: 'asc' } // Sắp xếp theo nhóm cho đẹp
    });
  },

  // 2. Lấy theo nhóm
  getSettingsByGroup: async (group: string) => {
    return prisma.systemSetting.findMany({
      where: { group }
    });
  },

  // 3. Lấy giá trị đơn lẻ (Helper)
  getSettingValue: async (key: string) => {
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    });
    // Logic parse giá trị dựa trên type
    if (setting) {
        if (setting.type === 'number') return Number(setting.value);
        if (setting.type === 'boolean') return setting.value === 'true';
        if (setting.type === 'json') return JSON.parse(setting.value);
        return setting.value;
    }
    return null;
  },

  // 4. Update (Bulk Upsert)
  updateSettings: async (settings: SettingItem[]) => {
    const operations = settings.map(item => {
      return prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { 
          value: String(item.value),
          description: item.description,
          group: item.group,
          // Nếu update có truyền type thì update, không thì giữ nguyên
          ...(item.type && { type: item.type }) 
        },
        create: {
          key: item.key,
          value: String(item.value),
          // Mặc định type là string nếu không truyền
          type: item.type || 'string', 
          description: item.description,
          group: item.group || 'GENERAL'
        }
      });
    });

    return prisma.$transaction(operations);
  },

  // 5. Init Default Data (Đã cập nhật type)
  initDefaultSettings: async () => {
    const defaults = [
      { key: 'COMPANY_NAME', value: 'My Store Chain', type: 'string', group: 'GENERAL', description: 'Tên hiển thị của hệ thống' },
      { key: 'CURRENCY', value: 'VND', type: 'string', group: 'FINANCE', description: 'Đơn vị tiền tệ' },
      { key: 'DEFAULT_TAX', value: '8', type: 'number', group: 'FINANCE', description: 'Thuế mặc định (%)' },
      { key: 'ALLOW_NEGATIVE_STOCK', value: 'false', type: 'boolean', group: 'INVENTORY', description: 'Cho phép bán âm kho' }
    ];

    await SettingsService.updateSettings(defaults);
  }
};