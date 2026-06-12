// Driver Application Screen - lets applicants correct and resubmit driver verification details.
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome6 } from '@expo/vector-icons';
import { Redirect, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import ImageCropper from '../../components/ImageCropper';
import FormErrorText from '../../components/FormErrorText';
import styles from './registration.styles';
import { useAppSession } from '@/components/providers/AppSessionProvider';
import {
  getApplicantVisibleReviewNote,
  getDriverApplicationDetail,
  saveDriverApplicationChanges,
} from '@/services/driver-applications/firebase-driver-applications';
import type { DriverApplicationDetail } from '@/services/contracts/admin-review';
import { validateDriverApplicationFields, type VehicleType } from '@/validations/validation';

const PRIMARY_COLOR = '#10B981';
const ERROR_COLOR = '#EF4444';

// Driver Application Screen - lets applicants correct and resubmit driver verification details.
export default function DriverApplicationScreen() {
  const router = useRouter();
  const { session, status } = useAppSession();
  const [application, setApplication] = useState<DriverApplicationDetail | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('');
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [newIdImage, setNewIdImage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || !session?.userId) {
      return;
    }

    let mounted = true;

    getDriverApplicationDetail(`driver_${session.userId}`)
      .then((nextApplication) => {
        if (!mounted) {
          return;
        }

        setApplication(nextApplication);
        setSelectedVehicle(nextApplication.vehicleType === 'Bus' ? 'Bus' : 'Jeepney');
        setPlateNumber(nextApplication.plateNumber);
        setLicenseNumber(nextApplication.licenseNumber);
        setScreenError(null);
        setIsLoading(false);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setScreenError(error instanceof Error ? error.message : 'We could not load your driver application.');
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session?.userId, status]);

  const validation = useMemo(
    () =>
      validateDriverApplicationFields({
        selectedVehicle,
        plateNumber,
        licenseNumber,
        idImage: newIdImage ?? application?.idImageUrl ?? null,
      }),
    [application?.idImageUrl, licenseNumber, newIdImage, plateNumber, selectedVehicle],
  );

  const latestReviewNote = useMemo(
    () => getApplicantVisibleReviewNote(application?.reviewNotes ?? []),
    [application?.reviewNotes],
  );

  // Driver ID Picker - requests media permissions and starts camera or gallery capture for the ID image.
  async function pickImage() {
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

    if (galleryStatus !== 'granted' || cameraStatus !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera and photo access to upload your ID.');
      return;
    }

    Alert.alert('Upload ID', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 1,
          });

          if (!result.canceled) {
            setCroppingImage(result.assets[0]?.uri ?? null);
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
            setCroppingImage(result.assets[0]?.uri ?? null);
            setShowCropper(true);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Driver ID Crop Complete - saves the cropped replacement ID image into form state.
  function handleCropComplete(croppedUri: string) {
    setNewIdImage(croppedUri);
    setShowCropper(false);
    setCroppingImage(null);
  }

  // Driver Application Submit - validates corrected details and returns the application to review.
  async function handleSubmit() {
    setSubmitted(true);

    if (!session?.userId || !application || Object.keys(validation).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await saveDriverApplicationChanges({
        uid: session.userId,
        applicationId: application.id,
        selectedVehicle,
        plateNumber,
        licenseNumber,
        idImageUri: newIdImage,
      });

      Alert.alert('Application updated', 'Your corrected driver application is back in the review queue.');
      router.replace('/pending-access' as Href);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'We could not save your driver application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <View style={styles.safeArea} />;
  }

  if (status === 'signedOut' || !session) {
    return <Redirect href="/login" />;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={PRIMARY_COLOR} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (screenError && !application) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          <Text style={styles.headerText}>Could not open your application</Text>
          <Text style={[styles.headerSubtext, { marginTop: 12 }]}>{screenError}</Text>
          <TouchableOpacity style={[styles.signUpButton, { marginTop: 24 }]} onPress={() => router.back()}>
            <Text style={styles.signUpText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!application) {
    return <Redirect href={session.defaultPostLoginRoute as Href} />;
  }

  if (application.status !== 'needs_resubmission') {
    return <Redirect href="/pending-access" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, localStyles.header]}>
          <View style={localStyles.headerTopRow}>
            <TouchableOpacity
              style={localStyles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerText, localStyles.headerText]}>Update Driver Application</Text>
          <Text style={[styles.headerSubtext, localStyles.headerSubtext]}>
            Send corrected details so your driver access can be reviewed again.
          </Text>
        </View>

        <View style={[styles.formContainer, localStyles.formContainer]}>
          {latestReviewNote ? (
            <View style={localStyles.noteCard}>
              <Text style={localStyles.noteLabel}>Reviewer note</Text>
              <Text style={localStyles.noteText}>{latestReviewNote}</Text>
            </View>
          ) : null}

          <View style={localStyles.section}>
            <Text style={[styles.sectionTitle, localStyles.sectionTitle]}>Driver Information</Text>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.selectedVehicle} />}
              <TouchableOpacity
                style={[
                  styles.inputRow,
                  vehicleOpen && styles.inputRowActive,
                  submitted && validation.selectedVehicle && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
                onPress={() => setVehicleOpen(!vehicleOpen)}
                activeOpacity={0.8}
              >
                <Ionicons name="bus-outline" size={20} color={PRIMARY_COLOR} style={styles.inputIcon} />
                <Text style={[styles.input, !selectedVehicle && { color: '#9CA3AF' }]}>
                  {selectedVehicle || 'Select Vehicle Type'}
                </Text>
                <Ionicons name={vehicleOpen ? 'chevron-up' : 'chevron-down'} size={20} color={PRIMARY_COLOR} />
              </TouchableOpacity>
            </View>

            {vehicleOpen ? (
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
            ) : null}

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.plateNumber} />}
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.plateNumber && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
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
            </View>

            <View style={styles.inputGroup}>
              {submitted && <FormErrorText error={validation.licenseNumber} />}
              <View
                style={[
                  styles.inputRow,
                  submitted && validation.licenseNumber && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
              >
                <MaterialCommunityIcons
                  name="card-account-details-outline"
                  size={20}
                  color={PRIMARY_COLOR}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="License Number (e.g., A12-34-123456)"
                  placeholderTextColor="#9CA3AF"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={localStyles.uploadSection}>
              <Text style={[styles.uploadLabel, localStyles.uploadLabel]}>Upload Corrected ID</Text>
              {submitted && <FormErrorText error={validation.idImage} />}
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  localStyles.uploadButton,
                  submitted && validation.idImage && { borderColor: ERROR_COLOR, borderWidth: 1.2 },
                ]}
                activeOpacity={0.8}
                onPress={pickImage}
              >
                <Ionicons name="cloud-upload-outline" size={28} color={PRIMARY_COLOR} />
                <View style={[styles.uploadTextContainer, localStyles.uploadTextContainer]}>
                  <Text style={[styles.uploadTitle, localStyles.uploadTitle]}>
                    {newIdImage ? 'Updated ID Ready' : application.idImageUrl ? 'Current ID On File' : 'Upload ID Image'}
                  </Text>
                  <Text style={[styles.uploadSubtext, localStyles.uploadSubtext]}>
                    {newIdImage
                      ? 'Tap to replace the selected image'
                      : application.idImageUrl
                        ? 'Tap to replace the previously uploaded image'
                        : 'Tap to take a photo or choose from gallery'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.signUpButton} activeOpacity={0.85} onPress={handleSubmit}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.signUpText}>Resubmit Application</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
          <FormErrorText error={screenError ?? undefined} />
        </View>
      </ScrollView>

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
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  header: {
    paddingTop: 42,
    paddingBottom: 38,
  },
  headerTopRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(5, 150, 105, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(236, 253, 245, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 27,
    lineHeight: 32,
    marginBottom: 10,
    maxWidth: 280,
  },
  headerSubtext: {
    fontSize: 13,
    lineHeight: 21,
    maxWidth: 300,
  },
  formContainer: {
    paddingTop: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 15,
    marginBottom: 14,
    letterSpacing: 0.7,
  },
  noteCard: {
    borderRadius: 16,
    backgroundColor: '#FFFCF1',
    borderWidth: 1,
    borderColor: '#F4D267',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
  },
  noteLabel: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  noteText: {
    color: '#78350F',
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: '600',
  },
  uploadSection: {
    marginTop: 4,
  },
  uploadLabel: {
    marginBottom: 10,
  },
  uploadButton: {
    paddingHorizontal: 15,
    paddingVertical: 17,
    gap: 14,
    borderRadius: 14,
  },
  uploadTextContainer: {
    paddingRight: 2,
  },
  uploadTitle: {
    fontSize: 14,
  },
  uploadSubtext: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
  },
});
