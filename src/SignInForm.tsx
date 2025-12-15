"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData).catch((error) => {
            let toastTitle = "";
            if (error.message.includes("Invalid password")) {
              toastTitle = "Noto'g'ri parol. Qaytadan urinib ko'ring.";
            } else {
              toastTitle =
                flow === "signIn"
                  ? "Kirish amalga oshmadi, ro'yxatdan o'tmoqchimisiz?"
                  : "Ro'yxatdan o'tish amalga oshmadi, kirishni xohlaysizmi?";
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
        }}
      >
        {flow === "signUp" && (
          <>
            <input
              className="auth-input-field"
              type="text"
              name="name"
              placeholder="Ism"
              required
            />
            <input
              className="auth-input-field"
              type="text"
              name="surname"
              placeholder="Familiya"
              required
            />
          </>
        )}
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Parol"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Kirish" : "Ro'yxatdan o'tish"}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Hisobingiz yo'qmi? "
              : "Allaqachon hisobingiz bormi? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Ro'yxatdan o'tish" : "Kirish"}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">yoki</span>
        <hr className="my-4 grow border-gray-200" />
      </div>
      <button className="auth-button" onClick={() => void signIn("anonymous")}>
        Anonim kirish
      </button>
    </div>
  );
}