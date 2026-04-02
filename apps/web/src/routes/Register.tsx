import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthForm } from "../components/AuthForm.js";
import api from "../lib/api.js";

export function Register() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (email: string, password: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", { email, password });
      setSuccess("注册成功！正在跳转登录页面...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || "注册失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="register"
      onSubmit={handleSubmit}
      error={error}
      success={success}
      loading={loading}
    >
      <p className="text-center text-sm text-gray-500">
        已有账号？{" "}
        <Link to="/login" className="text-primary font-medium hover:text-primary-dark transition-colors">
          去登录
        </Link>
      </p>
    </AuthForm>
  );
}
