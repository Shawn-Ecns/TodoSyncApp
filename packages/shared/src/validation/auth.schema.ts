import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少8个字符").max(128, "密码最多128个字符"),
});

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z
    .string()
    .min(8, "密码至少8个字符")
    .max(128, "密码最多128个字符"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token 不能为空"),
});
