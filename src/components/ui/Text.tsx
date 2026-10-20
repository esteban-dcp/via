import type { ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextProps } from 'react-native';
import { fontFamilyForWeight } from '../../theme';

const withFamily = (style: TextProps['style']) => {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  return [style, { fontFamily: fontFamilyForWeight(flat.fontWeight), fontWeight: undefined }];
};

/** Text con Plus Jakarta Sans y tope de escala de fuente (alturas fijas no se rompen). */
export const Text = ({ style, maxFontSizeMultiplier = 1.3, ...rest }: ComponentProps<typeof RNText>) => (
  <RNText maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFamily(style)} {...rest} />
);

export const TextInput = ({ style, maxFontSizeMultiplier = 1.3, ...rest }: ComponentProps<typeof RNTextInput>) => (
  <RNTextInput maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFamily(style) as ComponentProps<typeof RNTextInput>['style']} {...rest} />
);
