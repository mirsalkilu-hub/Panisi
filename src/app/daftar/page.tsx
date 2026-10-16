import type { Metadata } from "next";
import RegistrationForm from "./registration-form";

export const metadata: Metadata = {
  title: "Daftar sebagai Kontributor — PINISI",
  description: "Buat akun kontributor PINISI menggunakan kode undangan.",
};

export default function RegisterPage() {
  return <RegistrationForm />;
}
