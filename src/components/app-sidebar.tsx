import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Car,
  Users,
  ClipboardList,
  Wrench,
  Wallet,
  UserCog,
  FileText,
  History,
  Settings,
  ChevronRight,
  Plane,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/lib/i18n";
import { canViewFinance } from "@/lib/data-store";
import { useCurrentUser } from "@/lib/current-user";
import { BrandLogo, BrandMark } from "@/components/brand-logo";

export function AppSidebar() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showFinance = canViewFinance(user?.login);

  const main = [
    { title: t("dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("vehicles"), url: "/veiculos", icon: Car },
    { title: t("clients"), url: "/clientes", icon: Users },
    { title: t("maintenance"), url: "/manutencao", icon: Wrench },
    ...(showFinance ? [{ title: t("finance"), url: "/financeiro", icon: Wallet }] : []),
  ];
  const admin = [
    { title: t("users"), url: "/usuarios", icon: UserCog },
    { title: t("documents"), url: "/documentos", icon: FileText },
    { title: t("logs"), url: "/logs", icon: History },
    { title: t("settings"), url: "/configuracoes", icon: Settings },
  ];

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname === url || pathname.startsWith(url + "/");

  const rentalsOpen =
    pathname === "/locacoes" ||
    pathname.startsWith("/locacoes/") ||
    pathname.startsWith("/locacoes");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <BrandMark className="hidden group-data-[collapsible=icon]:flex" />
          <div className="flex min-w-0 flex-col gap-1 group-data-[collapsible=icon]:hidden">
            <BrandLogo className="h-8 w-[158px]" />
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Suriname
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("overview")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.slice(0, 3).map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <Collapsible asChild defaultOpen={rentalsOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={t("rentals")}
                      isActive={rentalsOpen}
                      className="cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span>{t("rentals")}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={
                            pathname === "/locacoes" ||
                            (pathname.startsWith("/locacoes/") &&
                              !pathname.startsWith("/locacoes/translato"))
                          }
                        >
                          <Link to="/locacoes">
                            <ClipboardList className="h-3.5 w-3.5" />
                            <span>{t("rentals")}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname.startsWith("/locacoes/translato")}
                        >
                          <Link to="/locacoes/translato">
                            <Plane className="h-3.5 w-3.5" />
                            <span>Translato</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {main.slice(3).map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>{t("settings")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {admin.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} tooltip={i.title}>
                    <Link to={i.url} className="flex items-center gap-2">
                      <i.icon className="h-4 w-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          {t("loginInternal")}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
