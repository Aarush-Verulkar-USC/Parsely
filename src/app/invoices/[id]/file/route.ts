import { error } from "@/lib/http";
import { getInvoiceForUser } from "@/lib/invoices";
import { requireUser } from "@/lib/session";
import { readOriginal } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let user;
  try {
    user = await requireUser(request);
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const record = await getInvoiceForUser(id, user.userId);
  if (!record) return error("Not found", 404);

  try {
    const bytes = await readOriginal(record.invoice.storagePath);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": record.invoice.mimeType,
        "content-disposition": `inline; filename="${record.invoice.originalFilename}"`,
        "cache-control": "private, max-age=300",
      },
    });
  } catch {
    return error("File unavailable", 404);
  }
}
