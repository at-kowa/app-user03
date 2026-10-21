"use client";

// 画面で共通に使う部品（バッジ、画像一覧、画像の選択、選択欄など）
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { closeTypeLabel, statusLabel, typeIcon, typeLabel, urgencyLabel } from "@/lib/labels";
import { resizeImage } from "@/lib/image";
import type { Image, Status, CloseType, TicketType, Urgency } from "@/lib/types";

export function StatusBadge({ status, closeType }: { status: Status; closeType?: CloseType | null }) {
  const cls = {
    received: "border-blue-200 bg-blue-50 text-blue-700",
    progress: "border-amber-200 bg-amber-50 text-amber-800",
    done: "border-green-200 bg-green-50 text-green-700",
  }[status];
  return (
    <Badge variant="outline" className={cls}>
      {statusLabel[status]}
      {status === "done" && closeType ? `（${closeTypeLabel[closeType]}）` : ""}
    </Badge>
  );
}

export function TypeBadge({ type }: { type: TicketType }) {
  return (
    <Badge variant="secondary">
      {typeIcon[type]} {typeLabel[type]}
    </Badge>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  // 色だけに頼らず、アイコンと文字でも伝える
  if (urgency === "stopped") return <Badge variant="destructive">🚨 {urgencyLabel[urgency]}</Badge>;
  return <Badge variant="outline">{urgencyLabel[urgency]}</Badge>;
}

export function UnreadBadge({ unread }: { unread?: boolean }) {
  return unread ? <Badge className="bg-red-600 text-white">● 未読</Badge> : null;
}

export function NewBadge() {
  return <Badge className="bg-blue-600 text-white">NEW</Badge>;
}

// 添付画像の一覧。押すと拡大表示する
export function Thumbs({ images }: { images: Image[] }) {
  const [open, setOpen] = useState<Image | null>(null);
  if (!images.length) return null;
  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((img, i) => (
          <button key={i} type="button" onClick={() => setOpen(img)} className="cursor-zoom-in" aria-label={`${img.name} を拡大`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.dataUrl} alt={img.name} className="h-24 w-32 rounded-lg border object-cover" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle>{open?.name}</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {open && <img src={open.dataUrl} alt={open.name} className="max-h-[75vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// 画像の選択欄（jpg・png、最大3枚。縮小してプレビューする）
export function ImagePicker({ id, images, onChange, max = 3 }: { id: string; images: Image[]; onChange: (v: Image[]) => void; max?: number }) {
  const [error, setError] = useState("");
  const onFiles = async (list: FileList | null) => {
    setError("");
    if (!list) return;
    const files = [...list].filter((f) => /^image\/(jpeg|png)$/.test(f.type));
    if (files.length < list.length) setError("jpg・png の画像だけ添付できます。");
    const next = [...images];
    for (const file of files) {
      if (next.length >= max) {
        setError(`画像は${max}枚までです。`);
        break;
      }
      next.push(await resizeImage(file));
    }
    onChange(next);
  };
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>画像を添付（jpg・png、{max}枚まで）</Label>
      <Input id={id} type="file" accept="image/jpeg,image/png" multiple onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      <p className="text-xs text-muted-foreground">iPad ではカメラで撮影できます。送信前に自動で小さくします。</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.dataUrl} alt={img.name} className="h-24 w-32 rounded-lg border object-cover" />
              <Button type="button" variant="outline" size="icon" className="absolute top-1 right-1 bg-background" aria-label={`${img.name} を外す`}
                onClick={() => onChange(images.filter((_, j) => j !== i))}>
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PrivacyNotice() {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-900">
      <AlertDescription className="text-amber-900">
        パスワード・口座番号・マイナンバーなどの個人情報や、図面・お客様からお預かりした資料は書かない・添付しないでください。
      </AlertDescription>
    </Alert>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function Loading() {
  return <p className="py-8 text-center text-muted-foreground">読み込み中…</p>;
}

export type Option = { value: string; label: string };

// shadcn/ui の Select を「値と選択肢の配列」で使えるようにしたもの
export function AppSelect({ id, value, onChange, options, placeholder, ariaLabel, className }: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const items = [...(placeholder !== undefined ? [{ value: null, label: placeholder }] : []), ...options];
  return (
    <Select items={items} value={value === "" ? null : value} onValueChange={(v) => onChange((v as string | null) ?? "")}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("bg-background", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value ?? "__none"} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// 種別・緊急度などを選ぶ大きなボタン（iPad で押しやすい大きさ）
export function ChoiceButtons<T extends string>({ value, onChange, options, label }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <Button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          variant={value === o.value ? "default" : "outline"} size="lg" className="h-16 text-base"
          onClick={() => onChange(o.value)}>
          {value === o.value && "✓ "}
          {o.label}
        </Button>
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, required, hint, children }: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor} className="font-semibold">
        {label}
        {required && <span className="ml-1 text-xs text-destructive">必須</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
