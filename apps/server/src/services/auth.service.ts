import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type { AuthResponse, AuthTokens } from "@todo-sync/shared";
import type { FastifyInstance } from "fastify";

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthService {
  constructor(private app: FastifyInstance) {}

  async register(email: string, password: string): Promise<AuthResponse> {
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw { statusCode: 409, message: "该邮箱已注册" };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw { statusCode: 401, message: "邮箱或密码错误" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw { statusCode: 401, message: "邮箱或密码错误" };
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    // Find and delete the used refresh token (single-use rotation)
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      // Delete expired token if found
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw { statusCode: 401, message: "Refresh token 无效或已过期" };
    }

    // Delete the used token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // Generate new token pair
    return this.generateTokens(stored.user.id, stored.user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  private async generateTokens(
    userId: string,
    email: string
  ): Promise<AuthTokens> {
    const accessToken = this.app.jwt.sign(
      { userId, email },
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
