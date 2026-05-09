import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";
import chancellorSignature from "@/assets/chancellor-signature.jpeg";

interface Props {
  certNumber: string;
  studentName: string;
  studentIdCode?: string | null;
  programName: string;
  certTitle: string;
  issuedAt: string;
  signatory?: string;
  registrarName?: string;
  chancellorName?: string;
}

/**
 * Institutional certificate: burgundy/ivory/gold, watermark seal,
 * registrar + chancellor signature lines, verification URL + machine-readable ID.
 */
export function CertificateView({
  certNumber,
  studentName,
  studentIdCode,
  programName,
  certTitle,
  issuedAt,
  registrarName = "Office of the Registrar",
  chancellorName = "Founder & Chancellor",
}: Props) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://scrolluniversity.org";
  const verifyUrl = `${origin}/verify/${certNumber}`;
  const verifyLabel = `${origin.replace(/^https?:\/\//, "")}/verify`;

  return (
    <div
      className="relative mx-auto bg-[#FAF6EC] text-[#3a1217] border-8 border-[#5C1F2A] p-6 sm:p-12 max-w-3xl rounded-lg shadow-2xl overflow-hidden"
      style={{ aspectRatio: "1.414 / 1" }}
    >
      {/* Inner gold frame */}
      <div className="absolute inset-3 border border-[#C9A84C] rounded pointer-events-none" />

      {/* Watermark seal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06]">
        <ShieldCheck className="h-[70%] w-[70%] text-[#5C1F2A]" strokeWidth={1} />
      </div>

      <div className="relative h-full flex flex-col text-center">
        <div className="flex items-center justify-center gap-3 mb-1">
          <ShieldCheck className="h-7 w-7 text-[#C9A84C]" />
          <span className="font-serif text-xs sm:text-sm tracking-[0.3em] uppercase text-[#5C1F2A]">
            ScrollUniversity
          </span>
        </div>
        <p className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-[#7a4146]">
          Office of the Registrar
        </p>

        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#7a4146] mt-5">
          This certifies that
        </p>

        <h1 className="font-serif text-2xl sm:text-4xl text-[#5C1F2A] mt-2">
          {studentName}
        </h1>
        {studentIdCode && (
          <p className="text-[10px] text-[#7a4146] mt-1 font-mono">{studentIdCode}</p>
        )}

        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#7a4146] mt-3">
          has successfully completed
        </p>

        <h2 className="font-serif text-lg sm:text-2xl text-[#3a1217] mt-1 px-4">
          {programName}
        </h2>

        <p className="text-xs sm:text-sm italic text-[#7a4146] mt-1">{certTitle}</p>

        <div className="flex-1" />

        {/* Footer: Date | Verification (QR) | Registrar */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 items-end mt-4 text-left">
          {/* Date */}
          <div className="text-[10px] sm:text-xs">
            <p className="font-serif border-t border-[#5C1F2A] pt-1">
              {new Date(issuedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className="text-[#7a4146] uppercase tracking-wider text-[9px] sm:text-[10px]">
              Date Issued
            </p>
          </div>

          {/* Center: QR + verification */}
          <div className="flex flex-col items-center justify-end">
            <div className="bg-white p-1.5 rounded border border-[#C9A84C]">
              <QRCodeSVG value={verifyUrl} size={64} level="M" />
            </div>
            <p className="text-[8px] sm:text-[9px] text-[#5C1F2A] mt-1 font-mono select-all">
              {certNumber}
            </p>
            <p className="text-[8px] text-[#7a4146]">Verify at: {verifyLabel}</p>
          </div>

          {/* Registrar */}
          <div className="text-[10px] sm:text-xs text-right">
            <p
              className="text-[#5C1F2A] text-base sm:text-lg leading-none pb-0.5"
              style={{ fontFamily: '"Brush Script MT", "Snell Roundhand", cursive' }}
            >
              {registrarName}
            </p>
            <p className="border-t border-[#5C1F2A] pt-1 font-serif">Registrar</p>
            <p className="text-[#7a4146] uppercase tracking-wider text-[9px] sm:text-[10px]">
              Authorized Signatory
            </p>
          </div>
        </div>

        {/* Secondary: Chancellor signature (real handwritten) */}
        <div className="mt-3 flex justify-end">
          <div className="text-right text-[10px] sm:text-xs w-1/3">
            <img
              src={chancellorSignature}
              alt="Founder & Chancellor signature"
              className="h-10 sm:h-12 ml-auto object-contain mix-blend-multiply"
              style={{ filter: "brightness(0) saturate(100%) invert(13%) sepia(40%) saturate(2000%) hue-rotate(330deg)" }}
            />
            <p className="border-t border-[#5C1F2A] pt-1 font-serif">{chancellorName}</p>
            <p className="text-[#7a4146] uppercase tracking-wider text-[9px] sm:text-[10px]">
              Founder &amp; Chancellor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
