import {
  ActivityIcon,
  BarChart3Icon,
  FileTextIcon,
  FolderIcon,
  GaugeIcon,
  HomeIcon,
  Link2Icon,
  LogOutIcon,
  MegaphoneIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftIcon,
  SettingsIcon,
  SunIcon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Activity } from "~/components/dashboard/activity";
import { Analytics } from "~/components/dashboard/analytics";
import { Campaigns } from "~/components/dashboard/campaigns";
import { Content } from "~/components/dashboard/content";
import { Files } from "~/components/dashboard/files";
import { Operations } from "~/components/dashboard/operations";
import { Overview } from "~/components/dashboard/overview";
import { Settings } from "~/components/dashboard/settings";
import { Shortlinks } from "~/components/dashboard/shortlinks";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/sonner";
import { authClient } from "~/lib/auth-client";
import { setThemeMode, themeMode, themePreference } from "~/lib/stores/theme";

export type DashboardModuleId =
  | "activity"
  | "analytics"
  | "campaigns"
  | "content"
  | "files"
  | "operations"
  | "overview"
  | "settings"
  | "shortlinks";

interface DashboardModule {
  component: () => React.JSX.Element;
  group: "system" | "workspace";
  icon: React.ComponentType<{ className?: string }>;
  id: DashboardModuleId;
  label: string;
}

const MODULES: DashboardModule[] = [
  {
    component: Overview,
    group: "workspace",
    icon: HomeIcon,
    id: "overview",
    label: "Overview",
  },
  {
    component: Content,
    group: "workspace",
    icon: FileTextIcon,
    id: "content",
    label: "Content",
  },
  {
    component: Files,
    group: "workspace",
    icon: FolderIcon,
    id: "files",
    label: "Files",
  },
  {
    component: Shortlinks,
    group: "workspace",
    icon: Link2Icon,
    id: "shortlinks",
    label: "Shortlinks",
  },
  {
    component: Campaigns,
    group: "workspace",
    icon: MegaphoneIcon,
    id: "campaigns",
    label: "Campaigns",
  },
  {
    component: Analytics,
    group: "system",
    icon: BarChart3Icon,
    id: "analytics",
    label: "Analytics",
  },
  {
    component: Activity,
    group: "system",
    icon: ActivityIcon,
    id: "activity",
    label: "Activity",
  },
  {
    component: Operations,
    group: "system",
    icon: WrenchIcon,
    id: "operations",
    label: "Operations",
  },
  {
    component: Settings,
    group: "system",
    icon: SettingsIcon,
    id: "settings",
    label: "Settings",
  },
];

const WORKSPACE_MODULES = MODULES.filter(
  (module) => module.group === "workspace",
);
const SYSTEM_MODULES = MODULES.filter((module) => module.group === "system");

type EnvironmentId = "development" | "production";

const ENVIRONMENT_KEY = "leenk-dashboard-environment";
const DEFAULT_ENVIRONMENT: EnvironmentId = "development";

function readEnvironment(): EnvironmentId {
  if (typeof window === "undefined") return DEFAULT_ENVIRONMENT;
  try {
    const stored = window.localStorage.getItem(ENVIRONMENT_KEY);
    return stored === "production" || stored === "development"
      ? stored
      : DEFAULT_ENVIRONMENT;
  } catch {
    return DEFAULT_ENVIRONMENT;
  }
}

function readActiveModule(): DashboardModuleId {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace(/^#\/?/, "");
  return isModuleId(hash) ? hash : "overview";
}

function isModuleId(value: string): value is DashboardModuleId {
  return MODULES.some((module) => module.id === value);
}

async function signOut() {
  await authClient.signOut();
  window.location.assign("/login");
}

export function DashboardShell() {
  const session = useClientSession();
  const operatorEmail = session.data?.user?.email ?? "Operator";
  const operatorInitials = (session.data?.user?.name ?? "OP")
    .split(/\s+/)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [activeModule, setActiveModule] =
    useState<DashboardModuleId>(readActiveModule);
  const [environment, setEnvironment] =
    useState<EnvironmentId>(readEnvironment);
  const [theme, setTheme] = useState<string>(() => themePreference.get());
  const [, forceThemeRender] = useState(0);

  const active = useMemo(
    () => MODULES.find((module) => module.id === activeModule) ?? MODULES[0]!,
    [activeModule],
  );

  useEffect(() => {
    const onHashChange = () => {
      setActiveModule(readActiveModule());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const unsubscribe = themeMode.subscribe(() =>
      forceThemeRender((value) => value + 1),
    );
    return unsubscribe;
  }, []);

  const navigate = (moduleId: DashboardModuleId) => {
    window.location.hash = moduleId;
    setActiveModule(moduleId);
  };

  const changeEnvironment = (value: EnvironmentId) => {
    setEnvironment(value);
    try {
      window.localStorage.setItem(ENVIRONMENT_KEY, value);
    } catch {
      // The selector stays functional when storage is unavailable.
    }
  };

  const changeTheme = (value: string) => {
    setTheme(value);
    if (value === "system") {
      themePreference.set("system");
    } else if (value === "dark" || value === "light") {
      setThemeMode(value);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/dashboard" aria-label="Leenk owner dashboard home">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <GaugeIcon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Leenk</span>
                    <span className="truncate text-xs">Owner console</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {WORKSPACE_MODULES.map((module) => (
                  <SidebarMenuItem key={module.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeModule === module.id}
                      tooltip={module.label}
                    >
                      <a
                        href={`#${module.id}`}
                        aria-current={
                          activeModule === module.id ? "page" : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          navigate(module.id);
                        }}
                      >
                        <module.icon className="size-4" aria-hidden="true" />
                        <span>{module.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SYSTEM_MODULES.map((module) => (
                  <SidebarMenuItem key={module.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={activeModule === module.id}
                      tooltip={module.label}
                    >
                      <a
                        href={`#${module.id}`}
                        aria-current={
                          activeModule === module.id ? "page" : undefined
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          navigate(module.id);
                        }}
                      >
                        <module.icon className="size-4" aria-hidden="true" />
                        <span>{module.label}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="/" target="_blank" rel="noreferrer">
                  <span className="bg-sidebar-primary text-sidebar-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                    <HomeIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span>View public site</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1">
            <PanelLeftIcon className="size-4" aria-hidden="true" />
            <span className="sr-only">Toggle sidebar</span>
          </SidebarTrigger>
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Owner console</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{active.label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={environment}
              onValueChange={(value) => {
                if (value === "development" || value === "production") {
                  changeEnvironment(value);
                }
              }}
            >
              <SelectTrigger
                className="hidden w-48 sm:flex"
                aria-label="Select environment"
              >
                <SelectValue placeholder="Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">
                  Development Environment
                </SelectItem>
                <SelectItem value="production">
                  Production Environment
                </SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Change theme"
                >
                  <ThemeIcon theme={theme} />
                  <span className="sr-only">Change theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => changeTheme("light")}>
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => changeTheme("dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => changeTheme("system")}>
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 gap-2 px-2"
                  aria-label="Open operator menu"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {operatorInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {operatorEmail}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{operatorEmail}</p>
                    <p className="text-muted-foreground text-xs">
                      {session.data?.user?.name ?? "Operator"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate("settings")}>
                  <SettingsIcon className="size-4" aria-hidden="true" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("operations")}>
                  <WrenchIcon className="size-4" aria-hidden="true" />
                  Operations
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOutIcon className="size-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="dashboard-main"
          className="flex-1 overflow-auto p-4 md:p-6"
          tabIndex={-1}
        >
          <active.component key={active.id} />
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

function useClientSession() {
  const [session, setSession] = useState<{
    data?: { user?: { email?: string; name?: string } } | null;
  }>({});
  useEffect(() => {
    let active = true;
    void authClient
      .getSession()
      .then((result) => {
        if (active) setSession({ data: result.data });
      })
      .catch(() => {
        if (active) setSession({});
      });
    return () => {
      active = false;
    };
  }, []);
  return session;
}

function ThemeIcon({ theme }: { theme: string }) {
  const current = themeMode.get();
  if (theme === "dark" || (theme === "system" && current === "dark")) {
    return <MoonIcon className="size-4" aria-hidden="true" />;
  }
  if (theme === "light" || (theme === "system" && current === "light")) {
    return <SunIcon className="size-4" aria-hidden="true" />;
  }
  return <MonitorIcon className="size-4" aria-hidden="true" />;
}
