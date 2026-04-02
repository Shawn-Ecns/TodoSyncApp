import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const decoded = await request.jwtVerify<{ userId: string; email: string }>();
    request.userId = decoded.userId;
  } catch {
    reply.code(401).send({ message: "未授权，请登录" });
  }
}
