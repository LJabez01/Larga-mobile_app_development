import { StyleSheet } from 'react-native';

export const commuterStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  map: {
    flex: 1,
  },

  // ── Search overlay (full-screen top sheet) ──────────────────────────────
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 10,
    paddingTop: 54,
    paddingBottom: 12,
  },
  searchOverlayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  searchOverlayInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 6,
  },
  searchOverlayIcon: {
    paddingLeft: 10,
  },
  searchRouteList: {
    maxHeight: 260,
  },
  searchRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchRouteItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
  },
  searchRouteEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  searchRouteEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
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

  // ── Map vehicle markers ──────────────────────────────────────────────────
  mapVehicleButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  mapVehicleButtonBus: {},
  mapVehicleButtonJeep: {},
  mapVehicleButtonActive: {
    borderWidth: 3,
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
  },
  mapVehicleIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },
  vehicleComingRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: 'rgba(21, 130, 81, 0.16)',
  },
});