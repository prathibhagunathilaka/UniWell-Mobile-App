import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export type PdfShareResult = 'shared' | 'print-dialog' | 'downloaded';

// Copies the PDF that expo-print wrote into the app's cache folder under a proper name.
// Sharing the raw expo-print URI fails on Android with "Not allowed to read file under given URL",
// because that file sits in a folder the share sheet is not permitted to read.
const copyToCache = async (sourceUri: string, filename: string): Promise<string> => {
  const fs = FileSystem as unknown as Record<string, any>;
  if (fs.File && fs.Paths) {
    const source = new fs.File(sourceUri);
    const target = new fs.File(fs.Paths.cache, filename);
    if (target.exists) target.delete();
    source.copy(target);
    return target.uri;
  }
  const target = `${fs.cacheDirectory}${filename}`;
  await fs.copyAsync({ from: sourceUri, to: target });
  return target;
};

/**
 * Turns HTML into a PDF and lets the user save/share it.
 *  - web: opens the browser print dialog ("Save as PDF")
 *  - phone: creates the PDF, copies it somewhere shareable and opens the share sheet
 *  - if anything in that chain fails: falls back to the system print dialog, which also has "Save as PDF"
 */
export const exportHtmlAsPdf = async (
  html: string,
  filename: string,
  size: { width: number; height: number },
  dialogTitle = 'Save or share PDF',
): Promise<PdfShareResult> => {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return 'downloaded';
  }

  const safeName = `${filename.replace(/[^\w.-]+/g, '-').replace(/\.pdf$/i, '')}.pdf`;

  let printed: string;
  try {
    printed = (await Print.printToFileAsync({ html, ...size })).uri;
  } catch {
    await Print.printAsync({ html });
    return 'print-dialog';
  }

  try {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
    let uri = printed;
    try {
      uri = await copyToCache(printed, safeName);
    } catch {
      // keep the original uri; the print-dialog fallback below still works if sharing refuses it
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
    return 'shared';
  } catch {
    await Print.printAsync({ html });
    return 'print-dialog';
  }
};
