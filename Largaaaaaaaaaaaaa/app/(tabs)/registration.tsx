import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Role = '' | 'Driver' | 'Commuter';
type VehicleType = '' | 'Jeepney' | 'Bus';

const PRIMARY_COLOR = '#10B981';
const SECONDARY_COLOR = '#059669';
const LIGHT_COLOR = '#F0FDF4';
const TEXT_COLOR = '#1F2937';
const BORDER_COLOR = '#E5E7EB';
const ERROR_COLOR = '#EF4444';

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

  const isDriver = selectedRole === 'Driver';
  const router = useRouter();

  return (
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

          {/* Password with toggle */}
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
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color={PRIMARY_COLOR}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password with toggle */}
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
              <Ionicons
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color={PRIMARY_COLOR}
              />
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
            <Ionicons 
              name={roleOpen ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={PRIMARY_COLOR} 
            />
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

            {/* Vehicle Type */}
            <TouchableOpacity
              style={[styles.inputRow, vehicleOpen && styles.inputRowActive]}
              onPress={() => {
                setVehicleOpen(!vehicleOpen);
                setRoleOpen(false);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="bus-front" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
              <Text style={[styles.input, !selectedVehicle && { color: '#9CA3AF' }]}>
                {selectedVehicle || 'Select Vehicle Type'}
              </Text>
              <Ionicons 
                name={vehicleOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={PRIMARY_COLOR}
              />
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

            {/* Plate Number */}
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

            {/* License Number */}
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

            {/* Upload License */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Driver's License</Text>
              <TouchableOpacity style={styles.uploadButton} activeOpacity={0.8}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={24} color={PRIMARY_COLOR} />
                <View style={styles.uploadTextContainer}>
                  <Text style={styles.uploadTitle}>Upload your license</Text>
                  <Text style={styles.uploadSubtext}>PDF, JPG, PNG up to 5MB</Text>
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
        <TouchableOpacity style={styles.signUpButton} activeOpacity={0.85}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 48,
  },
  
  /* Header */
  header: {
    backgroundColor: PRIMARY_COLOR,
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SECONDARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: LIGHT_COLOR,
  },
  headerText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtext: {
    color: LIGHT_COLOR,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  /* Form Container */
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },

  /* Sections */
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },

  /* Input Styles */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    overflow: 'hidden',
  },
  inputRowActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: LIGHT_COLOR,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT_COLOR,
    padding: 0,
    fontWeight: '500',
  },

  /* Dropdown */
  dropdown: {
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
    backgroundColor: LIGHT_COLOR,
    overflow: 'hidden',
    marginBottom: 14,
    borderTopWidth: 0,
    marginTop: -14,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
  },
  dropdownText: {
    fontSize: 15,
    color: TEXT_COLOR,
    fontWeight: '600',
  },

  /* Upload Section */
  uploadSection: {
    marginTop: 8,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: LIGHT_COLOR,
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },

  /* Checkbox & Terms */
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_COLOR,
    lineHeight: 22,
    fontWeight: '500',
  },
  termsLink: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  /* Buttons */
  signUpButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    gap: 8,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Sign In Link */
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signInPrompt: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  signInLink: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    fontSize: 14,
  },
});