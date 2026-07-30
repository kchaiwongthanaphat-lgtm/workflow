'use server';

import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveService() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials not configured in environment variables');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function uploadFileToDrive(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }

    const drive = await getDriveService();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error('Google Drive Folder ID not found.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: file.name,
      parents: [folderId]
    };

    const media = {
      mimeType: file.type,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make the file publicly readable (or accessible to anyone with the link)
    if (response.data.id) {
       await drive.permissions.create({
         fileId: response.data.id,
         requestBody: {
           role: 'reader',
           type: 'anyone',
         },
       });
    }

    return {
      success: true,
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
    };
  } catch (error: any) {
    console.error('Error uploading file to Drive:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteFileFromDrive(fileId: string) {
  try {
    const drive = await getDriveService();
    await drive.files.delete({ fileId });
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file from Drive:', error);
    return { success: false, error: error.message };
  }
}
