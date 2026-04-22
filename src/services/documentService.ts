import { supabase } from '../lib/supabase';
import { fetchR2Blob, isR2Enabled, uploadToR2 } from '../lib/r2';
import type { Document, StorageBackend } from '../types';
import type { Database } from '../types/database';

type DocRow = Database['public']['Tables']['documents']['Row'];

function toDocument(row: DocRow): Document {
  return {
    id: row.id,
    created_at: row.created_at,
    client_id: row.client_id,
    booking_id: row.booking_id ?? undefined,
    type: row.type as Document['type'],
    label: row.label ?? undefined,
    storage_path: row.storage_path,
    is_sensitive: row.is_sensitive,
    mime_type: row.mime_type ?? undefined,
    size_bytes: row.size_bytes ?? undefined,
    notes: row.notes ?? undefined,
    storage_backend: row.storage_backend,
  };
}

export async function fetchDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toDocument);
}

export async function fetchDocumentsForClient(clientId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toDocument);
}

export async function uploadDocument(
  file: File,
  clientId: string,
  bookingId?: string,
): Promise<Document> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const id = crypto.randomUUID();
  const ext = file.name.split('.').pop() || 'bin';
  const storagePath = `${session.user.id}/${clientId}/${id}.${ext}`;

  const isImage = file.type.startsWith('image/');
  const docType: Document['type'] = isImage ? 'image' : 'other';

  // Upload to Supabase Storage (primary during shadow-write era).
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  // Shadow-write to R2. If it fails, row stays 'supabase' and reads go
  // through Supabase — same safety net as booking-images in Phase 2.
  let storageBackend: StorageBackend = 'supabase';
  if (isR2Enabled()) {
    const r2Ok = await uploadToR2(
      `documents/${storagePath}`,
      file,
      file.type || 'application/octet-stream',
    ).catch((e) => {
      console.error('[documentService] R2 shadow-write threw:', e);
      return false;
    });
    if (r2Ok) storageBackend = 'r2';
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      id,
      client_id: clientId,
      booking_id: bookingId ?? null,
      type: docType,
      label: file.name,
      storage_path: storagePath,
      is_sensitive: false,
      mime_type: file.type || null,
      size_bytes: file.size,
      storage_backend: storageBackend,
    })
    .select()
    .single();

  if (error) throw error;
  return toDocument(data);
}

export async function deleteDocument(doc: Document): Promise<void> {
  // Supabase Storage blob. R2 blobs stay for ~30 days as a rollback safety
  // net per docs/r2-migration-plan.md — no R2 delete endpoint yet.
  await supabase.storage.from('documents').remove([doc.storage_path]);

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', doc.id);

  if (error) throw error;
}

// Resolve a Document to a URL usable by window.open / <a href>. R2-backed
// rows fetch the blob via the Worker (bearer auth) and return an Object URL;
// Supabase-backed rows use a 1-hour signed URL. The Object URL is live for
// the lifetime of the current page — callers don't need to revoke it since
// window.open / anchor navigation hands ownership to the target context.
export async function getSignedUrl(doc: Document): Promise<string> {
  if (doc.storage_backend === 'r2') {
    try {
      const blob = await fetchR2Blob(`documents/${doc.storage_path}`);
      if (blob) return URL.createObjectURL(blob);
    } catch (e) {
      console.error('[documentService] R2 read failed, falling back:', e);
    }
    // Fall through to Supabase if R2 read fails — shadow-write era safety net.
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 3600);

  if (error) throw error;
  return data.signedUrl;
}
