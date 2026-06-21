import fetch from 'node-fetch';
import FormData from 'form-data';

export async function uploadToTelegram(filename, buffer) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error('Telegram credentials are not configured in environment variables.');
  }

  const url = `https://api.telegram.org/bot${token}/sendDocument`;

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', buffer, { filename });

  console.log(`[Telegram Service] Uploading ${filename} (${buffer.length} bytes) to Telegram chat ${chatId}...`);
  const response = await fetch(url, {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Telegram Upload Failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram API Error: ${data.description}`);
  }

  // Get the file ID of the uploaded document
  const fileId = data.result.document.file_id;
  console.log(`[Telegram Service] Uploaded successfully. Telegram File ID: ${fileId}`);
  
  return {
    success: true,
    fileId
  };
}

export async function downloadFromTelegram(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Telegram Bot Token is not configured.');
  }

  // 1. Get file path
  const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  console.log(`[Telegram Service] Querying file path for File ID ${fileId}...`);
  
  const getFileRes = await fetch(getFileUrl);
  if (!getFileRes.ok) {
    throw new Error(`Failed to get file path from Telegram: ${getFileRes.status}`);
  }

  const getFileData = await getFileRes.json();
  if (!getFileData.ok) {
    throw new Error(`Telegram getFile API Error: ${getFileData.description}`);
  }

  const filePath = getFileData.result.file_path;
  
  // 2. Download the file
  const downloadUrl = `https://api.cloudflare.com/cdn-cgi/image/ /https://api.telegram.org/file/bot${token}/${filePath}`; // Wait, Cloudflare? No, direct download:
  const directUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  
  console.log(`[Telegram Service] Downloading file from Telegram: ${directUrl.slice(0, 45)}...`);
  const response = await fetch(directUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file content from Telegram: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadTelegramChunk(fileId, startByte, endByte) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Telegram Bot Token is not configured.');
  }

  // 1. Get file path and size
  const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const getFileRes = await fetch(getFileUrl);
  if (!getFileRes.ok) {
    throw new Error(`Failed to get file path from Telegram: ${getFileRes.status}`);
  }

  const getFileData = await getFileRes.json();
  if (!getFileData.ok) {
    throw new Error(`Telegram getFile API Error: ${getFileData.description}`);
  }

  const filePath = getFileData.result.file_path;
  const fileSize = getFileData.result.file_size;

  // 2. Download the chunk
  const directUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  const headers = {};
  if (startByte !== undefined && endByte !== undefined) {
    headers['Range'] = `bytes=${startByte}-${endByte}`;
  }

  const response = await fetch(directUrl, { headers });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Failed to download file chunk from Telegram: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    fileSize,
    filePath
  };
}

