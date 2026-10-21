"use client";

// S-02 パスワード変更（初回ログイン時は必須）
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RequireUser } from "@/components/require-user";
import { Field } from "@/components/parts";
import { repo } from "@/lib/repository";
import { useUser } from "@/lib/session";

export default function PasswordPage() {
  return (
    <RequireUser allowMustChange>
      <PasswordForm />
    </RequireUser>
  );
}

function PasswordForm() {
  const { user, update } = useUser();
  const router = useRouter();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState("");
  const forced = user.mustChangePassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1.length < 8) return setError("パスワードは8文字以上にしてください。");
    if (pw1 !== pw2) return setError("確認用のパスワードが一致しません。");
    // 本番では supabase Auth でパスワードを変更する。第1版では保存しない
    await repo.completePasswordChange(user.id);
    update({ mustChangePassword: false });
    toast.success("パスワードを変更しました。");
    router.replace("/");
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">パスワード変更</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {forced && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">はじめてのログインのため、パスワードを変更してください。</AlertDescription>
          </Alert>
        )}
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="新しいパスワード" htmlFor="pw1" hint="8文字以上">
            <Input id="pw1" type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
          </Field>
          <Field label="新しいパスワード（確認）" htmlFor="pw2">
            <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit">変更する</Button>
            {!forced && <Link href="/" className={buttonVariants({ variant: "outline" })}>戻る</Link>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
