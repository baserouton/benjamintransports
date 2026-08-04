import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/data-store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Locadora Admin" },
      { name: "description", content: "Contas de acesso da equipe com acesso total." },
      { property: "og:title", content: "Usuários — Locadora Admin" },
      { property: "og:description", content: "Gestão de usuários e permissões." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { t } = useI18n();
  const s = useStore();
  return (
    <div>
      <PageHeader title={t("users")} description={`${s.users.length} contas ativas · ${t("fullAccess")}`} />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Login</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.login}</TableCell>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge>{t("fullAccess")}</Badge></TableCell>
                  <TableCell>
                    {u.ativo ? <Badge variant="secondary">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
