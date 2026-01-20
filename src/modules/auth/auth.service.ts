import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-it';

export const login = async (email: string, password: string) => {
  // 1. Tìm user trong DB
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, store: true } // Lấy kèm role và store để check quyền
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 2. So sánh password (sử dụng bcrypt)
  // Note: Trong DB thật bạn cần lưu passwordHash, không lưu plain text
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // 3. Tạo JWT Token
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role?.name,
    storeId: user.storeId
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name,
      storeId: user.storeId
    }
  };
};