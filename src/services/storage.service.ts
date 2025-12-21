/**
 * Storage Service
 * 
 * Handles file uploads to Supabase Storage, specifically for QR code images.
 * Uses Supabase Storage buckets for file management.
 */

import { supabase } from '../lib/supabaseClient';
import * as ImagePicker from 'expo-image-picker';

export interface UploadResult {
  url: string;
  path: string;
}

export class StorageService {
  /**
   * Request permissions for image picker
   */
  static async requestImagePickerPermissions(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        return cameraStatus.status === 'granted';
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Pick an image from the device (gallery or camera)
   */
  static async pickImage(): Promise<string | null> {
    try {
      const hasPermission = await this.requestImagePickerPermissions();
      if (!hasPermission) {
        throw new Error('Permission to access camera roll or camera is required');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for QR codes
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Upload QR code image to Supabase Storage
   * @param imageUri - Local URI of the image to upload
   * @param adminId - ID of the admin user (for organizing files)
   * @param accountId - Optional account ID (for updates, to replace existing file)
   * @returns Public URL of the uploaded image
   */
  static async uploadQRCodeImage(
    imageUri: string,
    adminId: string,
    accountId?: string
  ): Promise<UploadResult> {
    try {
      // Generate unique file name
      const timestamp = Date.now();
      const fileName = accountId 
        ? `qr-code-${accountId}-${timestamp}.jpg`
        : `qr-code-${adminId}-${timestamp}.jpg`;
      const filePath = `qr-codes/${adminId}/${fileName}`;

      // Read file as ArrayBuffer using fetch (as per Supabase React Native example)
      // This is the recommended approach from Supabase documentation
      const arrayBuffer = await fetch(imageUri).then((res) => res.arrayBuffer());

      // Upload to Supabase Storage
      // Supabase accepts ArrayBuffer directly in React Native
      const { data, error } = await supabase.storage
        .from('bank-qr-codes')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true, // Replace if exists
        });

      if (error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('bank-qr-codes')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      console.error('Error uploading QR code image:', error);
      throw error;
    }
  }

  /**
   * Delete QR code image from Supabase Storage
   * @param filePath - Path of the file to delete
   */
  static async deleteQRCodeImage(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('bank-qr-codes')
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting QR code image:', error);
      throw error;
    }
  }

  /**
   * Extract file path from a Supabase Storage URL
   * @param url - Full public URL of the image
   * @returns File path relative to the bucket
   */
  static extractFilePathFromUrl(url: string): string | null {
    try {
      // Supabase Storage URLs typically look like:
      // https://[project].supabase.co/storage/v1/object/public/bank-qr-codes/qr-codes/[adminId]/[filename]
      const match = url.match(/\/bank-qr-codes\/(.+)$/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting file path from URL:', error);
      return null;
    }
  }
}

