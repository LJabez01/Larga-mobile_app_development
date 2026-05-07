import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
 Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './registration.styles';

type Role = '' | 'Driver' | 'Commuter';
type VehicleType = '' | 'Jeepney' | 'Bus';

const PRIMARY_COLOR = '#10B981';
const SECONDARY_COLOR = '#059669';
const LIGHT_COLOR = '#F0FDF4';
const TEXT_COLOR = '#1F2937';
const BORDER_COLOR = '#E5E7EB';

export default function CreateAccountScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleOpen, setRoleOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('');
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('');
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idImage, setIdImage] = useState<string | null>(null);

  const isDriver = selectedRole === 'Driver';
  const router = useRouter();

  const pickImage = async () => {
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

    if (galleryStatus !== 'granted' || cameraStatus !== 'granted') {
      Alert.alert('Permission to access camera and photo library is required.');
      return;
    }

    Alert.alert(
      'Upload ID',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled) setIdImage(result.assets[0].uri);
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 1,
            });
            if (!result.canceled) setIdImage(result.assets[0].uri);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="checkmark-done-outline" size={40} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerText}>Create Your Account</Text>
          <Text style={styles.headerSubtext}>Join us today and start your journey</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputRow}>
            <Ionicons name="person-circle-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="email-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Type</Text>

          <TouchableOpacity
            style={[styles.inputRow, roleOpen && styles.inputRowActive]}
            onPress={() => {
              setRoleOpen(!roleOpen);
              setVehicleOpen(false);
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="briefcase-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
            <Text style={[styles.input, !selectedRole && { color: '#9CA3AF' }]}>
              {selectedRole || 'Select Your Role'}
            </Text>
            <Ionicons name={roleOpen ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          {roleOpen && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedRole('Driver');
                  setRoleOpen(false);
                }}
              >
                <MaterialCommunityIcons name="steering" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.dropdownText}>Driver</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedRole('Commuter');
                  setRoleOpen(false);
                  setSelectedVehicle('');
                  setPlateNumber('');
                  setLicenseNumber('');
                  setVehicleOpen(false);
                  setIdImage(null);
                }}
              >
                <Ionicons name="person-outline" size={18} color={PRIMARY_COLOR} />
                <Text style={styles.dropdownText}>Commuter</Text>
              </TouchableOpacity>
            </View>
          )}
          </View>

          {/* Driver Section */}
          {isDriver && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Driver Information</Text>

            <TouchableOpacity
              style={[styles.inputRow, vehicleOpen && styles.inputRowActive]}
              onPress={() => {
                setVehicleOpen(!vehicleOpen);
                setRoleOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="bus-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
              <Text style={[styles.input, !selectedVehicle && { color: '#9CA3AF' }]}>
                {selectedVehicle || 'Select Vehicle Type'}
              </Text>
              <Ionicons name={vehicleOpen ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>

            {vehicleOpen && (
              <View style={styles.dropdown}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedVehicle('Jeepney');
                    setVehicleOpen(false);
                  }}
                >
                  <MaterialCommunityIcons name="car-door" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.dropdownText}>Jeepney</Text>
                </TouchableOpacity>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedVehicle('Bus');
                    setVehicleOpen(false);
                  }}
                >
                  <MaterialCommunityIcons name="bus" size={18} color={PRIMARY_COLOR} />
                  <Text style={styles.dropdownText}>Bus</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputRow}>
              <FontAwesome6 name="id-card" size={18} color={PRIMARY_COLOR} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Plate Number (e.g., ABC1234)"
                placeholderTextColor="#9CA3AF"
                value={plateNumber}
                onChangeText={setPlateNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="card-account-details-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="License Number (e.g., A12-34-123456)"
                placeholderTextColor="#9CA3AF"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                autoCapitalize="characters"
              />
            </View>

            {/* Upload ID */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Upload ID</Text>
              <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8} onPress={pickImage}>
                <Ionicons name="cloud-upload-outline" size={32} color={PRIMARY_COLOR} />
                <View style={styles.uploadTextContainer}>
                  <Text style={styles.uploadTitle}>
                    {idImage ? 'ID Image Selected ✓' : 'Upload ID Image'}
                  </Text>
                  <Text style={styles.uploadSubtext}>
                    {idImage ? 'Tap to change image' : 'Tap to take a photo or choose from gallery'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            </View>
          )}

          {/* Terms & Conditions */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink}>Terms and Conditions</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signUpButton} activeOpacity={0.85} onPress={() => router.push('/login')}>
            <Text style={styles.signUpText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.signInContainer}>
            <Text style={styles.signInPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.signInLink}>Sign in here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

