// Styled Text Helpers - expose shared text presets built on the themed text component.
import { Text, TextProps } from './Themed';

// Mono Text - applies the SpaceMono font to the shared themed text component.
export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}
