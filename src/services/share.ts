import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { HostInstance } from 'react-native';
import { SHARE_CARD_SIZE } from '../components/ShareCard';

/** Captura la ShareCard como PNG y abre el selector del sistema. Devuelve false si no se pudo. */
export const shareCardImage = async (ref: RefObject<HostInstance | null>): Promise<boolean> => {
  if (!ref.current) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  const uri = await captureRef(ref, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: SHARE_CARD_SIZE.outWidth,
    height: SHARE_CARD_SIZE.outHeight,
  });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartir precio de VIA' });
  return true;
};
