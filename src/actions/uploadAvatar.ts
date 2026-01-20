'use server'

/**
 * Upload Avatar Server Action
 * 
 * Uploads an avatar image to Supabase Storage and returns the public URL.
 * Validates file type and size before uploading.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'

export interface UploadAvatarResult {
  success: true
  url: string
}

export interface UploadAvatarError {
  error: 'AUTHENTICATION_REQUIRED' | 'VALIDATION_ERROR' | 'STORAGE_ERROR' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE'
  message: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

/**
 * Uploads an avatar image to Supabase Storage.
 * 
 * Requirements:
 * - User must be authenticated
 * - File must be an image (JPEG, PNG, GIF, WebP)
 * - File size must be less than 5MB
 * 
 * @param formData - FormData containing the file under 'avatar' key
 * @returns Success result with public URL, or error object
 */
export async function uploadAvatar(
  formData: FormData
): Promise<UploadAvatarResult | UploadAvatarError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to upload an avatar',
    }
  }

  const file = formData.get('avatar') as File | null

  if (!file) {
    return {
      error: 'VALIDATION_ERROR',
      message: 'No file provided',
    }
  }

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      error: 'INVALID_FILE_TYPE',
      message: 'File must be an image (JPEG, PNG, GIF, or WebP)',
    }
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      error: 'FILE_TOO_LARGE',
      message: 'File size must be less than 5MB',
    }
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = fileName

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    // If bucket doesn't exist, return helpful error
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
      return {
        error: 'STORAGE_ERROR',
        message: 'Avatar storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.',
      }
    }

    return {
      error: 'STORAGE_ERROR',
      message: `Failed to upload avatar: ${uploadError.message}`,
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

  if (!urlData?.publicUrl) {
    return {
      error: 'STORAGE_ERROR',
      message: 'Failed to get public URL for uploaded avatar',
    }
  }

  return {
    success: true,
    url: urlData.publicUrl,
  }
}

