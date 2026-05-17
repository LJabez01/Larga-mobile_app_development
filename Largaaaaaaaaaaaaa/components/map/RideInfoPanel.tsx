// Ride Info Panel - shows the selected ride details beneath the map.
import React from 'react';
import { View, TouchableOpacity, Text, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './ride-info-panel.styles';

const { width } = Dimensions.get('window');
const BASE_WIDTH = 700;
const scale = (size: number) => (width / BASE_WIDTH) * size;

type RideInfoPanelProps = {
  visible: boolean;
  vehicleType: 'bus' | 'jeep' | null;
  onClose: () => void;
};

const RIDE_INFO = {
  bus: {
    price: '13',
    route: 'Santa Maria - Halang',
    speed: '12 KM / Hour',
    distance: '20 KM',
    eta: '10 Minutes',
  },
  jeep: {
    price: '15',
    route: 'Santa Maria - Rosario',
    speed: '18 KM / Hour',
    distance: '25 KM',
    eta: '15 Minutes',
  },
};

export default function RideInfoPanel({ visible, vehicleType, onClose }: RideInfoPanelProps) {
  if (!vehicleType || !RIDE_INFO[vehicleType]) return null;

  const rideData = RIDE_INFO[vehicleType];
  const iconSize = scale(20);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayBackdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.panelWrapper}>
          <View style={styles.panelContainer}>
            {/* Left Section */}
            <View style={styles.leftSection}>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Fair Price (Based on your Drop Off Location)</Text>

                <View style={styles.priceDisplayWrapper}>
                  <Text style={styles.priceAmount}>{rideData.price}</Text>
                  <Text style={styles.pesoText}>PESOS</Text>
                </View>

                <View style={styles.priceDivider} />

                <View style={styles.buttonGroup}>
                  <TouchableOpacity style={styles.priceButton}>
                    <Text style={styles.priceButtonText}>Normal Price</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.priceButton, styles.priceButtonActive]}>
                    <Text style={[styles.priceButtonText, styles.priceButtonTextActive]}>
                      Discounted
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Right Section */}
            <View style={styles.rightSection}>
              <View style={styles.infoPill}>
                <Ionicons name="location" size={iconSize} color="#ffffff" />
                <View style={styles.pillTextWrapper}>
                  <Text style={styles.pillLabel}>
                    <Text style={styles.pillLabelBold}>Route: </Text>
                    <Text>{rideData.route}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.infoPill}>
                <Ionicons name="speedometer" size={iconSize} color="#ffffff" />
                <View style={styles.pillTextWrapper}>
                  <Text style={styles.pillLabel}>
                    <Text style={styles.pillLabelBold}>Speed: </Text>
                    <Text>{rideData.speed}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.infoPill}>
                <Ionicons name="map" size={iconSize} color="#ffffff" />
                <View style={styles.pillTextWrapper}>
                  <Text style={styles.pillLabel}>
                    <Text style={styles.pillLabelBold}>Distance: </Text>
                    <Text>{rideData.distance}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.infoPill}>
                <Ionicons name="time" size={iconSize} color="#ffffff" />
                <View style={styles.pillTextWrapper}>
                  <Text style={styles.pillLabel}>
                    <Text style={styles.pillLabelBold}>ETA: </Text>
                    <Text>{rideData.eta}</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
