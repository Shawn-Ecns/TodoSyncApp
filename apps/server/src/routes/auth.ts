import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema, refreshTokenSchema } from "@todo-sync/shared";
import { AuthService } from "../services/auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService(app);

  // Register
  app.post("/api/v1/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "输入验证失败",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await authService.register(parsed.data.email, parsed.data.password);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply
        .code(err.statusCode || 500)
        .send({ message: err.message || "注册失败" });
    }
  });

  // Login
  app.post("/api/v1/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "输入验证失败",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);
      return reply.send(result);
    } catch (err: any) {
      return reply
        .code(err.statusCode || 500)
        .send({ message: err.message || "登录失败" });
    }
  });

  // Refresh token
  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const parsed = refreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: "输入验证失败",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const tokens = await authService.refresh(parsed.data.refreshToken);
      return reply.send(tokens);
    } catch (err: any) {
      return reply
        .code(err.statusCode || 500)
        .send({ message: err.message || "Token 刷新失败" });
    }
  });

  // Logout
  app.post("/api/v1/auth/logout", async (request, reply) => {
    const parsed = refreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "输入验证失败" });
    }

    await authService.logout(parsed.data.refreshToken);
    return reply.code(204).send();
  });
}
