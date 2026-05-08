import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Base design was built on a ~700px wide tablet (Image 1).
// We scale everything relative to the current screen width.
const BASE_WIDTH = 700;
const scale = (size: number) => (width / BASE_WIDTH) * size;

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    flex: 1,
  },
  panelWrapper: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(32),
  },
  panelContainer: {
    backgroundColor: '#ffffff',
    borderRadius: scale(28),
    borderWidth: scale(4),
    borderColor: '#dce0df',
    flexDirection: 'row',
    overflow: 'hidden',
    height: scale(260),
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -scale(12) },
    shadowOpacity: 0.3,
    shadowRadius: scale(24),
    elevation: 20,
  },
  leftSection: {
    flex: 1.5,
    paddingHorizontal: scale(20),
    paddingVertical: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceBox: {
    width: '100%',
    borderWidth: scale(2.5),
    borderColor: '#e5e7e7',
    borderRadius: scale(16),
    paddingVertical: scale(22),
    paddingHorizontal: scale(12),
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: scale(11),
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: scale(10),
    lineHeight: scale(14),
  },
  priceDisplayWrapper: {
    alignItems: 'center',
    marginBottom: scale(8),
  },
  priceAmount: {
    fontSize: scale(52),
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: scale(56),
  },
  pesoText: {
    fontSize: scale(12),
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.8,
    marginTop: scale(1),
  },
  priceDivider: {
    width: '85%',
    height: 1,
    backgroundColor: '#d1d5db',
    marginVertical: scale(6),
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: scale(4),
    marginTop: scale(8),
    justifyContent: 'center',
  },
  priceButton: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(6),
    borderRadius: scale(14),
    borderWidth: scale(1.5),
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  priceButtonActive: {
    borderColor: '#0f701c',
    backgroundColor: '#ffffff',
  },
  priceButtonText: {
    fontSize: scale(11),
    fontWeight: '600',
    color: '#6b7280',
  },
  priceButtonTextActive: {
    color: '#0f172a',
  },
  divider: {
    width: scale(2.5),
    backgroundColor: '#b1b1b1',
    marginVertical: scale(16),
  },
  rightSection: {
    flex: 3,
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    justifyContent: 'space-evenly',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: scale(14),
    paddingHorizontal: scale(18),
    borderRadius: scale(24),
    gap: scale(14),
  },
  pillTextWrapper: {
    flex: 1,
  },
  pillLabel: {
    fontSize: scale(13),
    fontWeight: '500',
    color: '#ffffff',
  },
  pillLabelBold: {
    fontWeight: '700',
  },
  pillValue: {
    fontSize: scale(12),
    fontWeight: '700',
    color: '#ffffff',
    marginTop: scale(1),
  },
});