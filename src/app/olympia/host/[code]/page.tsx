"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import HostConsole from "@/components/olympia/HostConsole";

function Inner() {
  const { code } = useParams<{ code: string }>();
  const search = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const k = search?.get("key") || localStorage.getItem(`host_key_${code}`) || "";
    if (k) {
      localStorage.setItem(`host_key_${code}`, k);
      setKey(k);
    } else setKey("");
  }, [code, search]);

  if (key === null) return null;
  if (!key) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="space-y-3 w-full max-w-sm">
          <h1 className="text-xl font-bold">Nhập khóa quản trò (host key) phòng {code}</h1>
          <input
            className="w-full rounded-lg bg-slate-800 border border-white/20 px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="w-full rounded-lg bg-sky-500 text-slate-950 font-bold py-2"
            onClick={() => {
              if (!input.trim()) return;
              localStorage.setItem(`host_key_${code}`, input.trim());
              setKey(input.trim());
            }}
          >
            Vào bàn điều khiển
          </button>
        </div>
      </div>
    );
  }
  return <HostConsole code={code} hostKey={key} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
