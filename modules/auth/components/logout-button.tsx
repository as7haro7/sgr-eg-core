"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const logout = async () => {
    setIsPending(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  };

  return (
    <Button variant="secondary" onClick={logout} disabled={isPending}>
      <LogOut aria-hidden="true" className="size-4" />
      {isPending ? "Cerrando..." : "Cerrar sesión"}
    </Button>
  );
}
