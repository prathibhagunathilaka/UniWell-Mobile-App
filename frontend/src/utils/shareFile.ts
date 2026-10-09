import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// Saves text as a real file with the right name and type, then opens the share sheet for that FILE
// (Save to Files / Drive, email, Excel...). On web it downloads the file straight away.
// (The old approach, Share.share({ message }), only shared the text as a message.)
export const saveAndShareTextFile = async (
  filename: string,
  content: string,
  mimeType = 'text/csv',
  uti = 'public.comma-separated-values-text',
): Promise<'downloaded' | 'shared'> => {
  const safeName = filename.replace(/[^\w.-]+/g, '-');
  // A BOM makes Excel open UTF-8 CSVs (names with accents etc.) correctly.
  const body = mimeType === 'text/csv' && !content.startsWith('\uFEFF') ? `\uFEFF${content}` : content;

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([body], { type: `${mimeType};charset=utf-8` }));
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing files is not available on this device.');
  }

  // Works with both the current expo-file-system API (SDK 54+) and the older one.
  const fs = FileSystem as unknown as Record<string, any>;
  let uri: string;
  if (fs.File && fs.Paths) {
    const file = new fs.File(fs.Paths.cache, safeName);
    if (file.exists) file.delete();
    file.create();
    file.write(body);
    uri = file.uri;
  } else {
    uri = `${fs.cacheDirectory}${safeName}`;
    await fs.writeAsStringAsync(uri, body, { encoding: 'utf8' });
  }

  await Sharing.shareAsync(uri, { mimeType, UTI: uti, dialogTitle: safeName });
  return 'shared';
};
