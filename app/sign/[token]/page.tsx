import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { verifySignerToken } from "@/lib/token";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";
import { getSavedSignature } from "@/lib/actions/saved-signature";
import { openedSignature } from "@/lib/actions/submission";
import SigningForm from "@/components/signing/signing-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

const REASON_MESSAGE: Record<string, string> = {
  not_found: "ลิงก์ลงนามไม่ถูกต้องหรือไม่มีอยู่ This link is invalid or does not exist.",
  expired: "ลิงก์หมดอายุ กรุณาขอใหม่ This link has expired. Please request a new one.",
  used: "ลิงก์นี้ถูกใช้แล้ว This link has already been used.",
};

export default async function SignPage({ params }: PageProps) {
  const { token: rawToken } = await params;

  const verify = await verifySignerToken(rawToken);

  if (!verify.valid) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-3xl">🔒</p>
          <h1 className="mt-3 text-lg font-semibold text-red-700">
            ลิงก์ใช้ไม่ได้ Link Unavailable
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {REASON_MESSAGE[verify.reason] ?? "ลิงก์นี้ไม่ถูกต้อง This link is not valid."}
          </p>
        </div>
      </div>
    );
  }

  const signer = await prisma.signer.findUnique({
    where: { id: verify.signerId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      document: {
        select: {
          id: true,
          name: true,
          storagePath: true,
          fields: {
            where: { signerId: verify.signerId },
            select: {
              id: true,
              type: true,
              page: true,
              x: true,
              y: true,
              width: true,
              height: true,
              label: true,
              required: true,
              options: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!signer) notFound();

  // Already signed
  if (signer.status === "SIGNED") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-green-200 bg-green-50 p-8 text-center">
          <p className="text-3xl">✅</p>
          <h1 className="mt-3 text-lg font-semibold text-green-700">
            ลงนามแล้ว Already Signed
          </h1>
          <p className="mt-2 text-sm text-green-600">
            คุณลงนามเอกสารนี้แล้ว You have already signed this document.
          </p>
        </div>
      </div>
    );
  }

  // Capture request metadata for audit
  const reqHeaders = await headers();
  const ip =
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    reqHeaders.get("x-real-ip") ??
    undefined;
  const userAgent = reqHeaders.get("user-agent") ?? undefined;

  // Mark OPENED + emit audit event
  await openedSignature(signer.id, { ip, userAgent });

  const [{ data: urlData }, savedSigResult] = await Promise.all([
    supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(signer.document.storagePath, 60 * 60),
    getSavedSignature(signer.email),
  ]);

  if (!urlData?.signedUrl) notFound();

  return (
    <div className="flex min-h-full flex-col bg-zinc-50">
      {/* Header */}
      <header
        className="border-b bg-white px-4 py-3"
        style={{ borderColor: "var(--border, #E5E7EB)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--primary, #0F1059)" }}
            >
              <svg
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="white"
                aria-hidden
              >
                <polygon points="4,2 16,2 18,10 16,18 4,18 2,10" />
              </svg>
            </div>
            <span
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: "var(--primary, #0F1059)" }}
            >
              eSign
            </span>
          </div>
          <p
            className="truncate text-xs"
            style={{ color: "var(--accent, #ADB5BD)" }}
          >
            {signer.document.name}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-0 py-0 sm:px-4 sm:py-6">
        <SigningForm
          signerId={signer.id}
          tokenId={verify.tokenId}
          signerName={signer.name}
          signerEmail={signer.email}
          documentName={signer.document.name}
          pdfUrl={urlData.signedUrl}
          fields={signer.document.fields}
          savedSignature={savedSigResult.ok ? savedSigResult.data : null}
          ip={ip}
          userAgent={userAgent}
        />
      </main>
    </div>
  );
}
