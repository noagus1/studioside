'use server'

/**
 * Upload Studio Logo Server Action
 * 
 * Uploads a studio logo image to Supabase Storage and returns the public URL.
 * Validates file type and size before uploading.
 * Only owners and managers can upload studio logos.
 */

import { getSupabaseClient } from '@/lib/supabase/serverClient'
import { getCurrentStudioId } from '@/lib/cookies/currentStudio'

export interface UploadStudioLogoResult {
  success: true
  url: string
}

export interface UploadStudioLogoError {
  error: 'AUTHENTICATION_REQUIRED' | 'NO_STUDIO' | 'NOT_A_MEMBER' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR' | 'STORAGE_ERROR' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE'
  message: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

/**
 * Uploads a studio logo image to Supabase Storage.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must be owner or admin of the studio
 * - File must be an image (JPEG, PNG, GIF, WebP)
 * - File size must be less than 5MB
 * 
 * @param formData - FormData containing the file under 'logo' key
 * @returns Success result with public URL, or error object
 */
export async function uploadStudioLogo(
  formData: FormData
): Promise<UploadStudioLogoResult | UploadStudioLogoError> {
  const supabase = await getSupabaseClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: 'AUTHENTICATION_REQUIRED',
      message: 'You must be logged in to upload a studio logo',
    }
  }

  // Get current studio
  const studioId = await getCurrentStudioId()

  if (!studioId) {
    return {
      error: 'NO_STUDIO',
      message: 'No studio selected',
    }
  }

  // Set studio context for RLS
  try {
    await supabase.rpc('set_current_studio_id', { studio_uuid: studioId })
  } catch (error) {
    console.warn('Failed to set current_studio_id:', error)
  }

  // Check if user is owner or admin
  const { data: membership, error: membershipError } = await supabase
    .from('studio_users')
    .select('role')
    .eq('studio_id', studioId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError || !membership) {
    return {
      error: 'NOT_A_MEMBER',
      message: 'You are not a member of this studio',
    }
  }

  if (membership.role !== 'owner' && membership.role !== 'admin') {
    return {
      error: 'PERMISSION_DENIED',
      message: 'Only owners and managers can upload studio logos',
    }
  }

  const file = formData.get('logo') as File | null

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
  const fileName = `${studioId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = fileName

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload to Supabase Storage
  // Using 'studio-logos' bucket (or 'avatars' if studio-logos doesn't exist yet)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('studio-logos')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    // If bucket doesn't exist, try 'avatars' as fallback
    if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
      // Try avatars bucket as fallback
      const { data: fallbackUploadData, error: fallbackError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (fallbackError) {
        return {
          error: 'STORAGE_ERROR',
          message: 'Studio logo storage bucket not configured. Please create a "studio-logos" or "avatars" bucket in Supabase Storage.',
        }
      }

      // Get public URL from fallback bucket
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        return {
          error: 'STORAGE_ERROR',
          message: 'Failed to get public URL for uploaded logo',
        }
      }

      return {
        success: true,
        url: urlData.publicUrl,
      }
    }

    return {
      error: 'STORAGE_ERROR',
      message: `Failed to upload logo: ${uploadError.message}`,
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('studio-logos').getPublicUrl(filePath)

  if (!urlData?.publicUrl) {
    return {
      error: 'STORAGE_ERROR',
      message: 'Failed to get public URL for uploaded logo',
    }
  }

  return {
    success: true,
    url: urlData.publicUrl,
  }
}
