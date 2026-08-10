import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

const ENVIRONMENT_KEY = "leenk-dashboard-environment";
const DEFAULT_RANGE_KEY = "leenk-dashboard-default-range";

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Operator preferences only
        </p>
      </div>
      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences">
          <PreferencesCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PreferencesCard() {
  const [environment, setEnvironment] = useState<string>("development");
  const [defaultRange, setDefaultRange] = useState<string>("30");

  useEffect(() => {
    try {
      const storedEnvironment = window.localStorage.getItem(ENVIRONMENT_KEY);
      if (
        storedEnvironment === "development" ||
        storedEnvironment === "production"
      ) {
        setEnvironment(storedEnvironment);
      }
      const storedRange = window.localStorage.getItem(DEFAULT_RANGE_KEY);
      if (storedRange === "7" || storedRange === "30" || storedRange === "90") {
        setDefaultRange(storedRange);
      }
    } catch {
      // Preferences remain at their defaults when storage is unavailable.
    }
  }, []);

  const saveEnvironment = (value: string) => {
    setEnvironment(value);
    try {
      window.localStorage.setItem(ENVIRONMENT_KEY, value);
    } catch {
      // The selector stays functional without storage.
    }
    toast.success("Environment preference saved");
  };

  const saveRange = (value: string) => {
    setDefaultRange(value);
    try {
      window.localStorage.setItem(DEFAULT_RANGE_KEY, value);
    } catch {
      // The selector stays functional without storage.
    }
    toast.success("Default range saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Stored locally in this browser. They do not change live configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:max-w-md">
        <div className="space-y-2">
          <Label htmlFor="settings-environment">Environment</Label>
          <Select value={environment} onValueChange={saveEnvironment}>
            <SelectTrigger id="settings-environment" aria-label="Environment">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="development">
                Development Environment
              </SelectItem>
              <SelectItem value="production">Production Environment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="settings-range">Default analytics range</Label>
          <Select value={defaultRange} onValueChange={saveRange}>
            <SelectTrigger
              id="settings-range"
              aria-label="Default analytics range"
            >
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
