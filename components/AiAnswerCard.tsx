"use client";

type PermitResult = {
  permit_required?: string;
  permit_required_detail?: string;
  permit_type?: string;
  local_authority?: string;
  relevant_codes?: string[];
  inspection_notes?: string;
  disclaimer?: string;
};

type JobCaptureResult = {
  job_title?: string;
  customer?: { name?: string; phone?: string; email?: string; address?: string };
  notes?: string;
  line_items?: { description: string; qty: number; unit_price: number | null }[];
};

const PERMIT_COLORS: Record<string, string> = {
  Yes: "bg-red-100 text-red-700",
  No: "bg-green-100 text-green-700",
  Likely: "bg-amber-100 text-amber-700",
  "Depends on scope": "bg-blue-100 text-blue-700",
};

function PermitCard({ data }: { data: PermitResult }) {
  return (
    <div className="space-y-3 text-sm">
      {data.permit_required && (
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${PERMIT_COLORS[data.permit_required] ?? "bg-gray-100 text-gray-700"}`}>
            {data.permit_required === "Yes" ? "⚠️ Permit Required" :
             data.permit_required === "No" ? "✅ No Permit Needed" :
             `⚡ ${data.permit_required}`}
          </span>
        </div>
      )}
      {data.permit_required_detail && (
        <p className="text-gray-600 text-xs">{data.permit_required_detail}</p>
      )}
      {data.permit_type && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Permit Type</p>
          <p className="text-slate-700 text-xs">{data.permit_type}</p>
        </div>
      )}
      {data.local_authority && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Contact</p>
          <p className="text-slate-700 text-xs">{data.local_authority}</p>
        </div>
      )}
      {data.relevant_codes && data.relevant_codes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Relevant Codes</p>
          <ul className="space-y-0.5">
            {data.relevant_codes.map((c, i) => (
              <li key={i} className="text-xs text-slate-600">• {c}</li>
            ))}
          </ul>
        </div>
      )}
      {data.inspection_notes && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Inspections</p>
          <p className="text-xs text-slate-600">{data.inspection_notes}</p>
        </div>
      )}
      {data.disclaimer && (
        <p className="text-xs text-gray-400 italic border-t pt-2">{data.disclaimer}</p>
      )}
    </div>
  );
}

function JobCaptureCard({ data }: { data: JobCaptureResult }) {
  return (
    <div className="space-y-2 text-sm">
      {data.job_title && (
        <p className="font-semibold text-slate-800">{data.job_title}</p>
      )}
      {data.customer?.name && (
        <p className="text-xs text-gray-500">
          {data.customer.name}
          {data.customer.phone ? ` · ${data.customer.phone}` : ""}
          {data.customer.address ? ` · ${data.customer.address}` : ""}
        </p>
      )}
      {data.line_items && data.line_items.length > 0 && (
        <div className="space-y-1">
          {data.line_items.map((li, i) => (
            <div key={i} className="flex justify-between text-xs text-slate-600">
              <span>{li.description} × {li.qty}</span>
              <span>{li.unit_price != null ? `$${li.unit_price}` : "Price TBD"}</span>
            </div>
          ))}
        </div>
      )}
      {data.notes && (
        <p className="text-xs text-gray-500 border-t pt-2">{data.notes}</p>
      )}
    </div>
  );
}

export function AiAnswerCard({
  feature,
  outputJson,
  outputText,
}: {
  feature: string;
  outputJson: Record<string, unknown> | null;
  outputText: string | null;
}) {
  if (feature === "permit_assistant" && outputJson) {
    return <PermitCard data={outputJson as PermitResult} />;
  }
  if ((feature === "job_capture" || feature === "voice_job") && outputJson) {
    return <JobCaptureCard data={outputJson as JobCaptureResult} />;
  }
  if (outputText) {
    return <p className="text-sm text-slate-700 whitespace-pre-wrap">{outputText}</p>;
  }
  return <p className="text-sm text-gray-400">No output recorded.</p>;
}
