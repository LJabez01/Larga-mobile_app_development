import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import styles from './registration.styles';
import ImageCropper from '../../components/ImageCropper';
import FormErrorText from '../../components/FormErrorText';
import { validateRegistrationForm } from '../../validations/validation';

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
  const [idImage, setIdImage] = useState<string | null>(null);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const isDriver = selectedRole === 'Driver';
  const router = useRouter();

  // Real-time validation
  const validation = useMemo(
    () =>
      validateRegistrationForm({
        username,
        email,
        password,
        confirmPassword,
        selectedRole,
        selectedVehicle,
        plateNumber,
        licenseNumber,
        idImage,
        agreed,
      }),
    [username, email, password, confirmPassword, selectedRole, selectedVehicle, plateNumber, licenseNumber, idImage, agreed]
  );

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
              allowsEditing: false,
              quality: 1,
            });
            if (!result.canceled) {
              setCroppingImage(result.assets[0].uri);
              setShowCropper(true);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 1,
            });
            if (!result.canceled) {
              setCroppingImage(result.assets[0].uri);
              setShowCropper(true);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCropComplete = (croppedUri: string) => {
    setIdImage(croppedUri);
    setShowCropper(false);
    setCroppingImage(null);
  };

  const handleCreateAccount = () => {
    setSubmitted(true);

    if (validation.isValid) {
      // Navigate to login on success
      router.push('/login');
    }
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

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.username} />}
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.username && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <Ionicons name="person-circle-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={setUsername}
                  onBlur={() => setTouched({ ...touched, username: true })}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.email} />}
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.email && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <MaterialCommunityIcons name="email-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.password} />}
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.password && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.confirmPassword} />}
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.fieldErrors?.confirmPassword && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color={PRIMARY_COLOR} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Type</Text>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.fieldErrors?.selectedRole} />}
              <TouchableOpacity
                style={[
                  styles.inputRow,
                  roleOpen && styles.inputRowActive,
                  submitted && validation.fieldErrors?.selectedRole && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
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
            </View>

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

              <View style={styles.inputGroup}>
                {submitted && <FormErrorText error={validation.fieldErrors?.selectedVehicle} />}
                <TouchableOpacity
                  style={[
                    styles.inputRow,
                    vehicleOpen && styles.inputRowActive,
                    submitted && validation.fieldErrors?.selectedVehicle && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
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
              </View>

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

              <View style={styles.inputGroup}>
                {submitted && <FormErrorText error={validation.fieldErrors?.plateNumber} />}
                <View
                  style={[
                    styles.inputRow,
                    submitted && validation.fieldErrors?.plateNumber && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                >
                  <FontAwesome6 name="id-card" size={18} color={PRIMARY_COLOR} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Plate Number (e.g., ABC1234)"
                    placeholderTextColor="#9CA3AF"
                    value={plateNumber}
                    onChangeText={setPlateNumber}
                    onBlur={() => setTouched({ ...touched, plateNumber: true })}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                {submitted && <FormErrorText error={validation.fieldErrors?.licenseNumber} />}
                <View
                  style={[
                    styles.inputRow,
                    submitted && validation.fieldErrors?.licenseNumber && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                >
                  <MaterialCommunityIcons name="card-account-details-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="License Number (e.g., A12-34-123456)"
                    placeholderTextColor="#9CA3AF"
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    onBlur={() => setTouched({ ...touched, licenseNumber: true })}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Upload ID */}
              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Upload ID</Text>
                {submitted && <FormErrorText error={validation.fieldErrors?.idImage} />}
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    submitted && validation.fieldErrors?.idImage && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                  ]}
                  activeOpacity={0.8}
                  onPress={pickImage}
                >
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
              onPress={() => setShowTerms(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the Terms and Conditions and Privacy Policy
              </Text>
            </TouchableOpacity>
            {submitted && <FormErrorText error={validation.fieldErrors?.agreed} />}
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signUpButton} activeOpacity={0.85} onPress={handleCreateAccount}>
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

      {/* Image Cropper Modal */}
      <ImageCropper
        visible={showCropper}
        imageUri={croppingImage || ''}
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setShowCropper(false);
          setCroppingImage(null);
        }}
        aspectRatio={{ width: 85, height: 54 }}
      />

      {/* Terms Modal */}
      <Modal visible={showTerms} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowTerms(false);
                setShowPrivacy(true);
              }} 
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <View style={styles.closeBtn} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </Text>

            <Text style={styles.modalText}>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </Text>

            <Text style={styles.modalText}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </Text>

            <Text style={styles.modalText}>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
            </Text>

            <Text style={styles.modalText}>
              Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal visible={showPrivacy} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowPrivacy(false);
                setAgreed(true);
              }} 
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <View style={styles.closeBtn} />
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalText}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </Text>

            <Text style={styles.modalText}>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </Text>

            <Text style={styles.modalText}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </Text>

            <Text style={styles.modalText}>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.
            </Text>

            <Text style={styles.modalText}>
              Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}