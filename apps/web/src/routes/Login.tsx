import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthForm } from "../components/AuthForm.js";
import { useAuthStore } from "../stores/authStore.js";
import api from "../lib/api.js";
import type { AuthResponse } from "@todo-sync/shared";

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>("/api/v1/auth/login", {
        email,
        password,
      });
      login(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      onSubmit={handleSubmit}
      error={error}
      success={null}
      loading={loading}
    >
      <p className="text-center text-sm text-gray-500">
        还没有账号？{" "}
        <Link to="/register" className="text-primary font-medium hover:text-primary-dark transition-colors">
          去注册
        </Link>
      </p>
    </AuthForm>
  );
}
