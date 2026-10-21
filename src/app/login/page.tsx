"use client";

// S-01 ログイン
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/parts";
import { repo } from "@/lib/repository";
import { roleLabel } from "@/lib/labels";
import { useSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useSession();
  const [empNo, setEmpNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const accounts = repo.listTestAccounts();

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNo || !password) return setError("社員番号とパスワードを入力してください。");
    const u = await repo.login(empNo);
    if (!u) return setError("社員番号またはパスワードが違うか、利用できないアカウントです。");
    login(u);
    router.replace(u.mustChangePassword ? "/password" : "/");
  };

  return (
    <main className="mx-auto grid w-full max-w-md gap-4 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">情シス質問箱</CardTitle>
          <CardDescription>社員番号とパスワードでログインしてください。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <Field label="社員番号" htmlFor="empNo">
              <Input id="empNo" inputMode="numeric" autoComplete="username" value={empNo} onChange={(e) => setEmpNo(e.target.value)} />
            </Field>
            <Field label="パスワード" htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">ログイン</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>画面確認用のテストアカウント</CardTitle>
          <CardDescription>第1版ではパスワードは確認しません（何か入力すればログインできます）。</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 text-sm">
            {accounts.map((a) => (
              <li key={a.empNo} className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setEmpNo(a.empNo)}>{a.empNo}</Button>
                {a.name}（{roleLabel[a.role]}{a.active ? "" : "・無効"}{a.mustChangePassword ? "・初回変更あり" : ""}）
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
