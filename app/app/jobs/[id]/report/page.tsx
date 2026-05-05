import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserOrg } from "@/lib/auth";
import { getUserOrgRole, isOwnerOrAdmin } from "@/lib/orgRole";
import { JobReviewPanel } from "@/components/JobReviewPanel";

export default async function JobReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const orgId = await ensureUserOrg();
  const admin = createAdminClient();
  const { role } = await getUserOrgRole();
  const canReview = isOwnerOrAdmin(role);

  // Fetch job
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (admin as any)
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("org_id", orgId!)
    .single();

  if (!job) return notFound();

  const templateId = job.template_id as string | null;
  if (!templateId) {
    return (
      <div className="p-4 space-y-4">
        <Link href={`/app/jobs/${jobId}`} className="text-gray-400 flex items-center gap-2 text-sm">
          ← Back to Job
        </Link>
        <p className="text-gray-500 text-sm">No template assigned to this job — no report available.</p>
      </div>
    );
  }

  // Fetch all report data in parallel
  const [templateRes, fieldsRes, responsesRes, photosRes, customerRes, notesRes, reportRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_templates").select("name,required_photo_count").eq("id", templateId).single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_template_fields").select("id,label,field_type,required,sort_order").eq("template_id", templateId).order("sort_order", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_field_responses").select("field_id,value").eq("job_id", jobId).eq("org_id", orgId!),
    admin.from("photos").select("id,url,filename,created_at").eq("entity_type", "job").eq("entity_id", jobId).eq("org_id", orgId!).order("created_at", { ascending: true }),
    admin.from("customers").select("first_name,last_name,phone,email,address_line1,city,state").eq("id", job.customer_id).single(),
    admin.from("notes").select("body,created_at").eq("entity_type", "job").eq("entity_id", jobId).eq("org_id", orgId!).order("created_at", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("job_reports").select("id,generated_at,technician_id").eq("job_id", jobId).eq("org_id", orgId!).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const template = templateRes.data;
  const fields: { id: string; label: string; field_type: string; required: boolean }[] = fieldsRes.data ?? [];
  const responses: { field_id: string; value: string }[] = responsesRes.data ?? [];
  const photos: { id: string; url: string; filename: string }[] = photosRes.data ?? [];
  const customer = customerRes.data;
  const notes: { body: string; created_at: string }[] = (notesRes.data ?? []).filter((n: { body: string }) => !n.body.startsWith("__"));
  const report = reportRes.data;

  const responseMap = Object.fromEntries(responses.map(r => [r.field_id, r.value]));
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Unknown";
  const cityState = [customer?.city, customer?.state].filter(Boolean).join(", ") || null;

  const completedAt = job.completed_at
    ? new Date(job.completed_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  const isSubmitted = job.status === "submitted_for_review";
  const isCompleted = job.status === "completed";

  return (
    <div className="p-4 space-y-4 pb-10">
      <div className="flex items-center gap-3">
        <Link href={`/app/jobs/${jobId}`} className="text-gray-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">Job Report</h1>
          <p className="text-sm text-gray-500">{job.job_title}</p>
        </div>
        {isSubmitted && (
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-purple-100 text-purple-700">Awaiting Review</span>
        )}
        {isCompleted && (
          <span className="text-xs font-semibold rounded-full px-3 py-1 bg-green-100 text-green-700">Completed</span>
        )}
      </div>

      {/* Admin review panel */}
      {isSubmitted && canReview && (
        <JobReviewPanel jobId={jobId} />
      )}

      {/* Tech submitted — non-admin view */}
      {isSubmitted && !canReview && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-purple-800">✓ Submitted for Review</p>
          <p className="text-xs text-purple-600 mt-1">Your report has been submitted. Your manager will review and approve it shortly.</p>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Template</p>
          <span className="text-xs font-medium text-[#1B3A6B]">{template?.name ?? "—"}</span>
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Customer</span>
            <span className="text-xs font-medium text-slate-800">{customerName}</span>
          </div>
          {cityState && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Location</span>
              <span className="text-xs font-medium text-slate-800">{cityState}</span>
            </div>
          )}
          {job.address && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Address</span>
              <span className="text-xs font-medium text-slate-800 text-right max-w-[60%]">{job.address}</span>
            </div>
          )}
          {job.scheduled_date && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Job Date</span>
              <span className="text-xs font-medium text-slate-800">
                {new Date(job.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
          {completedAt && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Completed</span>
              <span className="text-xs font-medium text-slate-800">{completedAt}</span>
            </div>
          )}
          {report?.generated_at && (
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Report Generated</span>
              <span className="text-xs font-medium text-slate-800">
                {new Date(report.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Field responses */}
      {fields.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Work Completed</p>
          {fields.map(field => {
            const val = responseMap[field.id] ?? "";
            return (
              <div key={field.id} className="border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <p className="text-xs text-gray-400 mb-0.5">{field.label}{field.required && " *"}</p>
                {val ? (
                  <p className={`text-sm font-medium ${val === "Yes" ? "text-green-700" : val === "No" ? "text-red-600" : "text-slate-800"}`}>
                    {val === "Yes" ? "✓ Yes" : val === "No" ? "✕ No" : val}
                  </p>
                ) : (
                  <p className="text-sm text-gray-300 italic">Not recorded</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Photos ({photos.length}{template?.required_photo_count ? ` / ${template.required_photo_count} required` : ""})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                <img
                  src={photo.url}
                  alt={photo.filename ?? "Photo"}
                  className="w-full aspect-square object-cover rounded-xl"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Site Notes</p>
          {notes.map((note, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-slate-700">{note.body}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(note.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* TODO Phase 4: Generate invoice preview from report/template/quote */}
      {/* TODO Phase 4: Add warranty preview */}
      {/* TODO Phase 4: Allow trusted techs to send report/invoice/warranty to customer */}

      {/* Phase 4: Closeout package link — shown for completed jobs */}
      {isCompleted && (
        <Link
          href={`/app/jobs/${jobId}/closeout`}
          className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-white font-bold text-sm shadow-sm"
          style={{ backgroundColor: "#1B3A6B" }}>
          📦 Prepare Closeout Package
        </Link>
      )}

      <Link
        href={`/app/jobs/${jobId}`}
        className="flex items-center justify-center gap-2 w-full rounded-xl py-3 bg-white border border-gray-200 text-slate-700 font-semibold text-sm shadow-sm">
        ← Back to Job
      </Link>
    </div>
  );
}
