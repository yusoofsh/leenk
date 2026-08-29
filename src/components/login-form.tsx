import { useState } from "react";
import * as stylex from "@stylexjs/stylex";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";
import { cls } from "~/lib/sx";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  card: {
    maxWidth: "24rem",
    width: "100%",
  },
  error: {
    color: colors.destructive,
    fontSize: "0.875rem",
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  form: {
    display: "grid",
    gap: "1rem",
  },
});

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Sign in failed");
      return;
    }
    window.location.assign(next);
  };

  return (
    <Card className={cls(styles.card)}>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Operator access to the Leenk dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form {...stylex.props(styles.form)} onSubmit={submit}>
          <div {...stylex.props(styles.field)}>
            <Label htmlFor="login-email">Email</Label>
            <Input
              autoComplete="email"
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div {...stylex.props(styles.field)}>
            <Label htmlFor="login-password">Password</Label>
            <Input
              autoComplete="current-password"
              id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
          {error ? (
            <p role="alert" {...stylex.props(styles.error)}>
              {error}
            </p>
          ) : null}
          <Button disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
