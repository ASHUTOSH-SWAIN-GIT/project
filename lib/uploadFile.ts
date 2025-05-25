import { supabase } from './supabase';

export async function uploadFile(file: File, folder = 'media') {
  // Check if user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error('Auth error:', authError.message);
    throw new Error('Authentication check failed');
  }

  if (!user) {
    throw new Error('User not authenticated');
  }

  const fileExt = file.name.split('.').pop();
  const filePath = `${folder}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from('bucket-1').upload(filePath, file);

  if (error) {
    console.error('Upload error:', error.message);
    throw error;
  }

  const { data } = supabase.storage.from('bucket-1').getPublicUrl(filePath);
  return data.publicUrl;
}
