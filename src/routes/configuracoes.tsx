import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Locadora Admin" },
      { name: "description", content: "Perfil do usuário, idioma e preferências." },
      { property: "og:title", content: "Configurações — Locadora Admin" },
      { property: "og:description", content: "Preferências do painel." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const [profile, setProfile] = useState({ nome: "Admin 1", email: "admin1@locadora.sr" });

  return (
    <div>
      <PageHeader title={t("settings")} description={t("profile")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("name")}</Label>
              <Input value={profile.nome} onChange={(e) => setProfile({ ...profile, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("email")}</Label>
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <Button onClick={() => toast.success(t("saved"))}>{t("save")}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("language")}</Label>
              <Select value={lang} onValueChange={(v) => setLang(v as "pt" | "nl")}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português (BR)</SelectItem>
                  <SelectItem value="nl">Nederlands</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("theme")}</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => document.documentElement.classList.remove("dark")}>{t("light")}</Button>
                <Button variant="outline" size="sm" onClick={() => document.documentElement.classList.add("dark")}>{t("dark")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
