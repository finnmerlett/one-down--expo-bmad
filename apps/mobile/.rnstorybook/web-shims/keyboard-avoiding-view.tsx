// Web stand-in for react-native-web's KeyboardAvoidingView, which is a plain
// View. metro.config.js swaps it in for web bundles. Implements the
// `behavior="padding"` the app uses (the others fall back to a View), driven
// by keyboard events from ./keyboard — the story renderer's mock keyboard.
import { Component, createRef, type ComponentProps } from 'react';
import View from 'react-native-web/dist/exports/View';

import Keyboard, { type KeyboardMetrics } from './keyboard';

type Props = ComponentProps<typeof View> & {
  behavior?: 'height' | 'position' | 'padding';
  keyboardVerticalOffset?: number;
};

export default class KeyboardAvoidingView extends Component<Props, { bottom: number }> {
  state = { bottom: 0 };
  private ref = createRef<HTMLElement>();
  private subscriptions: Array<{ remove: () => void }> = [];

  componentDidMount() {
    this.subscriptions = [
      Keyboard.addListener('keyboardDidShow', ({ endCoordinates }) => this.update(endCoordinates)),
      Keyboard.addListener('keyboardDidHide', () => this.setState({ bottom: 0 })),
    ];
  }

  componentWillUnmount() {
    for (const subscription of this.subscriptions) subscription.remove();
  }

  /** Same rule as RN's: pad by how far the keyboard overlaps this view's bottom edge. */
  private update(keyboard: KeyboardMetrics) {
    const rect = this.ref.current?.getBoundingClientRect();
    if (!rect) return;
    const keyboardY = keyboard.screenY - (this.props.keyboardVerticalOffset ?? 0);
    this.setState({ bottom: Math.max(rect.bottom - keyboardY, 0) });
  }

  render() {
    const { behavior, keyboardVerticalOffset: _offset, style, ...rest } = this.props;
    const pad = behavior === 'padding' ? { paddingBottom: this.state.bottom } : null;
    return <View ref={this.ref} {...rest} style={[style, pad]} />;
  }
}
