'use server';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function getGoogleAuth() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (!base64) throw new Error('GOOGLE_SERVICE_ACCOUNT_BASE64 is not set');
  
  const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string | null;

    if (!file || !taskId) {
      return NextResponse.json({ error: 'File and taskId are required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Authenticate with Google Drive
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Convert File to a readable stream for Google Drive API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Upload file to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    const driveFileId = driveResponse.data.id;
    const webViewLink = driveResponse.data.webViewLink;

    if (!driveFileId || !webViewLink) {
      return NextResponse.json({ error: 'Failed to upload to Google Drive' }, { status: 500 });
    }

    // Make the file accessible via link
    await drive.permissions.create({
      fileId: driveFileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Save attachment metadata to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        task_id: taskId,
        file_name: file.name,
        file_type: file.type,
        drive_file_id: driveFileId,
        drive_web_view_link: webViewLink,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save attachment metadata' }, { status: 500 });
    }

    return NextResponse.json({ success: true, attachment });
  } catch (error: unknown) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
