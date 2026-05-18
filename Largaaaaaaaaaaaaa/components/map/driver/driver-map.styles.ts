import { StyleSheet } from 'react-native';

export const driverStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },

  // ── Top bar ─────────────────────────────────────────────────────────────
  topBarRow: {
    position: 'absolute',
    top: 54,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },

  // ── Search overlay (full-screen top sheet) ──────────────────────────────
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    paddingTop: 54,
    paddingBottom: 12,
  },
  searchOverlayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#dcfce7',
    paddingBottom: 12,
  },
  searchOverlayInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 8,
    letterSpacing: 0.2,
  },
  searchOverlayIcon: {
    paddingLeft: 12,
  },
  searchRouteList: {
    maxHeight: 260,
  },
  searchRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchRouteItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  searchRouteEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  searchRouteEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  // ── Search bar pill ──────────────────────────────────────────────────────
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBarSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchInputPlaceholder: {
    color: '#94a3b8',
  },
  searchInputSelected: {
    color: '#ffffff',
  },
});