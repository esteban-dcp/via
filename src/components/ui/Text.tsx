import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps } from 'react-native';
import { fontFamilyForWeight } from '../../theme';

const withFamily = (style: TextProps['style']) => {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return style;
  return [style, { fontFamily: fontFamilyForWeight(flat.fontWeight), fontWeight: undefined }];
};

/** Text con Plus Jakarta Sans y tope de escala de fuente (alturas fijas no se rompen). */
export const Text = forwardRef<RNText, TextProps>(({ style, maxFontSizeMultiplier = 1.3, ...rest }, ref) => (
  <RNText ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFamily(style)} {...rest} />
));
Text.displayName = 'Text';

export const TextInput = forwardRef<RNTextInput, TextInputProps>(({ style, maxFontSizeMultiplier = 1.3, ...rest }, ref) => (
  <RNTextInput ref={ref} maxFontSizeMultiplier={maxFontSizeMultiplier} style={withFamily(style) as TextInputProps['style']} {...rest} />
));
TextInput.displayName = 'TextInput';
