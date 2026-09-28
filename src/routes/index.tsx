import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/finia/auth-screen";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Acceso — FinIA 50" }, { name: "description", content: "Accede a tu plataforma privada de inteligencia financiera." }, { property: "og:title", content: "FinIA 50" }, { property: "og:description", content: "Control, claridad y disciplina para tu libertad financiera." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthScreen,
});
