import { supabase } from '../lib/supabase';
import type { Document } from '../types';
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

  // Determine type from mime
  const isImage = file.type.startsWith('image/');
  const docType: Document['type'] = isImage ? 'image' : 'other';

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  // Insert metadata row
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
    })
    .select()
    .single();

  if (error) throw error;
  return toDocument(data);
}

export async function deleteDocument(doc: Document): Promise<void> {
  // Delete from storage
  await supabase.storage.from('documents').remove([doc.storage_path]);

  // Delete metadata row
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', doc.id);

  if (error) throw error;
}

export function getDocumentUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);

  if (error) throw error;
  return data.signedUrl;
}
