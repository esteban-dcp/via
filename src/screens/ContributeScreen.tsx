import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Text } from '../components/ui/Text';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { runOcrWithRetries, type OcrOutput } from '../services/ocr';
import { CropTool } from '../components/CropTool';
import { PriceSelector } from '../components/PriceSelector';
import { PhotoPreview } from '../components/PhotoPreview';
import { StationSelector } from '../components/StationSelector';
import { Stepper } from '../components/Stepper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { colors, radius, spacing, typography } from '../theme';
import { supabase } from '../services/supabase';
import { stationRepository } from '../services/stationRepository';
import { useUserStore } from '../state/userStore';
import { useLocationStore } from '../state/locationStore';
import { toast } from '../state/toastStore';
import type { FuelType, FuelPriceInput, StationMarker } from '../types';

export const ContributeScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile, session } = useUserStore();
  const coords = useLocationStore((s) => s.coords);
  const getFreshFix = useLocationStore((s) => s.getFreshFix);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [prices, setPrices] = useState<FuelPriceInput>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'camera' | 'crop' | 'review' | 'confirm'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationMarker | null>(null);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [freshReady, setFreshReady] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [ocrError, setOcrError] = useState<string>('');
  const [stationsNearby, setStationsNearby] = useState<StationMarker[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  const resetAllRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      if (step === 'camera') return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (loading) return true;
        if (step === 'confirm') setStep('review');
        else resetAllRef.current();
        return true;
      });
      return () => sub.remove();
    }, [step, loading]),
  );

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 14;
    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [step]);

  const stepStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const selectedStationRef = useRef(selectedStation);
  selectedStationRef.current = selectedStation;

  const loadNearbyAndAutoSelect = useCallback(async () => {
    if (!coords) return;
    setStationsLoading(true);
    try {
      const stations = await stationRepository.getNearbyStations(coords, 10000, 50);
      setStationsNearby(stations);
      if (stations.length > 0 && !selectedStationRef.current) {
        const closest = stations[0];
        if (closest.distanceMeters <= 1000) {
          setSelectedStation(closest);
        }
      }
    } catch {
      setStationsNearby([]);
    } finally {
      setStationsLoading(false);
    }
  }, [coords]);

  useEffect(() => {
    if (step === 'review' && coords && freshReady) {
      loadNearbyAndAutoSelect();
    }
  }, [step, coords, freshReady, loadNearbyAndAutoSelect]);

  // Al entrar a revisión se fuerza un fix fresco: la lista de estaciones y la posición
  // reportada deben reflejar dónde está el usuario ahora, no el último punto en caché.
  useEffect(() => {
    if (step !== 'review') {
      setFreshReady(false);
      return;
    }
    // Si no hay GPS se sigue con el último punto, pero ya sin esperar un fix mejor.
    getFreshFix().catch(() => {}).finally(() => setFreshReady(true));
  }, [step, getFreshFix]);

  const pickImage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hasPermission = await ImagePicker.getCameraPermissionsAsync();
      if (!hasPermission.granted) {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        if (!req.granted) {
          setError('Permiso de cámara denegado');
          setLoading(false);
          return;
        }
      }
    } catch (permErr) {
      console.warn('[Camera] Permission check failed:', permErr);
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.5,
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: false,
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError('No se recibió foto de la cámara');
        setLoading(false);
        return;
      }

      const uri = asset.uri;
      setImageUri(uri);
      setOcrRawText('');
      setOcrError('');
      setOcrDone(false);
      setStep('crop');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido de la cámara';
      console.error('[Camera]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const runOcr = useCallback(async (uri: string) => {
    setLoading(true);
    try {
      const { output } = await runOcrWithRetries(uri);
      setPrices(output.prices);
      setOcrRawText(output.rawText || '');
      setOcrConfidence(output.confidence);
      if (output.error) {
        setOcrError(output.error);
      }
      if (Object.keys(output.prices).length === 0) {
        toast.info('No se detectaron precios. Ingrésalos manualmente.');
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.error('[OCR]', msg);
      setOcrError(msg);
      toast.error('OCR falló. Ingresa los precios manualmente.');
    } finally {
      setOcrDone(true);
      setLoading(false);
    }
  }, []);

  const updatePrice = (fuelType: FuelType, value: number) => {
    setPrices((prev: FuelPriceInput) => ({ ...prev, [fuelType]: value }));
  };

  const submitReport = useCallback(async () => {
    if (!imageUri || !session || !profile || !coords) return;
    if (!selectedStation) {
      setError('Debes seleccionar una estación para continuar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let position;
      try {
        position = await getFreshFix();
      } catch {
        throw new Error('Activa el GPS para enviar el reporte: necesitamos tu ubicación real.');
      }
      const filename = `${profile.id}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filename, {
          uri: imageUri,
          name: filename,
          type: 'image/jpeg',
        } as any);

      if (uploadError) throw uploadError;

      const imagePath = uploadData?.path ?? filename;
      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(imagePath);

      const { error: reportError } = await supabase.from('reports').insert({
        user_id: profile.id,
        image_url: publicUrl,
        ocr_json: prices,
        ocr_raw_text: ocrRawText || null,
        ocr_confidence: ocrConfidence > 0 ? ocrConfidence : null,
        station_id: selectedStation.stationId,
        reported_lat: position.latitude,
        reported_lng: position.longitude,
        status: 'pending',
      });

      if (reportError) throw reportError;

      await refreshProfile();

      toast.success('¡Reporte enviado! Ganaste +2 accesos.');
      setImageUri(null);
      setPrices({});
      setSelectedStation(null);
      setOcrRawText('');
      setOcrConfidence(0);
      setOcrError('');
      setStationsNearby([]);
      setStep('camera');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [imageUri, session, profile, prices, selectedStation, refreshProfile, getFreshFix, ocrRawText, ocrConfidence]);

  const handleCrop = useCallback((croppedUri: string) => {
    setImageUri(croppedUri);
    setStep('review');
    runOcr(croppedUri);
  }, [runOcr]);

  const resetAll = useCallback(() => {
    setStep('camera');
    setImageUri(null);
    setPrices({});
    setSelectedStation(null);
    setError(null);
    setOcrRawText('');
    setOcrConfidence(0);
    setOcrError('');
    setStationsNearby([]);
  }, []);
  resetAllRef.current = resetAll;

  const hasPrices = Object.values(prices).some((v) => typeof v === 'number' && v > 0);
  const hasStationsAvailable = !stationsLoading && stationsNearby.length > 0;
  const canContinue = hasPrices && (!hasStationsAvailable || selectedStation != null);
  const allFuelTypes: FuelType[] = ['ecopais', 'super', 'diesel'];

  return (
    <View style={styles.container}>
      {step === 'crop' && imageUri ? (
        <CropTool uri={imageUri} onCrop={handleCrop} onCancel={resetAll} />
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 120 }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Contribuir</Text>
              <Text style={styles.subtitle}>Comparte precios frescos y gana acceso.</Text>
            </View>
          </View>

          <Stepper steps={['Foto', 'Recorte', 'Precios', 'Enviar']} current={step === 'camera' ? 0 : step === 'review' ? 2 : 3} />

          {step === 'camera' && (
            <Animated.View style={stepStyle}>
              <Card variant="glass">
                <View style={styles.sectionHeader}>
                  <Ionicons name="camera" size={18} color={colors.accentSoft} />
                  <Text style={styles.sectionTitle}>Captura el display del surtidor</Text>
                </View>
                <Text style={styles.bodyText}>
                  Una foto clara mejora la precisión del OCR y acelera la revisión.
                </Text>
                {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
                <Button
                  title="Abrir cámara"
                  icon="camera"
                  variant="primary"
                  loading={loading}
                  onPress={pickImage}
                  size="lg"
                  style={{ marginTop: spacing.lg }}
                />
              </Card>
            </Animated.View>
          )}

          {step === 'review' && imageUri && (
            <Animated.View style={stepStyle}>
              <PhotoPreview uri={imageUri} onRetake={resetAll} />

              <Card variant="glass" style={{ marginTop: spacing.md }}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pricetags" size={18} color={colors.accentSoft} />
                  <Text style={styles.sectionTitle}>Precios</Text>
                </View>
                <Text style={styles.bodyText}>
                    {ocrDone ? 'Ajusta cualquier valor incorrecto abajo.' : 'Ejecutando OCR...'}
                </Text>
                {loading && !ocrDone ? (
                  <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.md }} />
                ) : (
                  <View style={styles.prices}>
                    {allFuelTypes.map((fuelType) => (
                      <PriceSelector
                        key={fuelType}
                        label={FUEL_DISPLAY[fuelType]}
                        value={prices[fuelType] ?? 0}
                        onChange={(v) => updatePrice(fuelType, v)}
                      />
                    ))}
                  </View>
                )}
              </Card>

              <Card variant="glass" style={{ marginTop: spacing.md }}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="location" size={18} color={colors.accentSoft} />
                  <Text style={styles.sectionTitle}>Estación</Text>
                </View>
                <Text style={styles.bodyText}>
                  Selecciona a qué estación pertenece este precio.
                </Text>
                <Button
                  title={selectedStation?.name ?? 'Elegir estación...'}
                  icon={selectedStation ? 'checkmark-circle' : 'ellipse-outline'}
                  variant="secondary"
                  size="sm"
                  onPress={() => setShowStationPicker(true)}
                  style={{ marginTop: spacing.md }}
                />
              </Card>

              {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

              <View style={styles.actions}>
                <Button title="Atrás" variant="secondary" icon="arrow-back" onPress={resetAll} size="md" style={{ flex: 1 }} />
                <Button
                  title="Continuar"
                  variant="primary"
                  icon="arrow-forward"
                  disabled={!canContinue}
                  onPress={() => setStep('confirm')}
                  size="md"
                  style={{ flex: 1 }}
                />
              </View>
            </Animated.View>
          )}

          {step === 'confirm' && imageUri && (
            <Animated.View style={stepStyle}>
              <Card variant="glass">
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text style={styles.sectionTitle}>Confirmar reporte</Text>
                </View>

                <View style={styles.confirmPhoto}>
                  <Ionicons name="image" size={16} color={colors.textMuted} />
                  <Text style={styles.confirmPhotoText}>Foto capturada</Text>
                </View>

                <View style={styles.confirmRow}>
                  <Ionicons name="location" size={16} color={colors.textSecondary} />
                  <Text style={styles.confirmLabel}>Estación:</Text>
                  <Text style={styles.confirmValue} numberOfLines={1}>
                    {selectedStation?.name ?? 'No seleccionada'}
                  </Text>
                </View>

                <View style={styles.confirmPrices}>
                  <Text style={styles.confirmPricesLabel}>Precios</Text>
                  <View style={styles.confirmPricesGrid}>
                    {allFuelTypes.map((ft) => {
                      const v = prices[ft];
                      if (v == null || v === 0) return null;
                      return (
                        <View key={ft} style={styles.confirmPriceItem}>
                          <Badge variant="info" label={FUEL_DISPLAY[ft]} />
                          <Text style={styles.confirmPriceValue}>${v.toFixed(2)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

                <View style={styles.actions}>
                  <Button
                    title="Editar"
                    variant="secondary"
                    icon="arrow-back"
                    onPress={() => setStep('review')}
                    size="md"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Enviar"
                    variant="primary"
                    icon="cloud-upload"
                    loading={loading}
                    onPress={submitReport}
                    size="md"
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            </Animated.View>
          )}
        </ScrollView>
      )}

      {showStationPicker && (
        <StationSelector
          selectedId={selectedStation?.stationId ?? null}
          userCoords={coords}
          onSelect={(s) => {
            setSelectedStation(s);
            setShowStationPicker(false);
          }}
          onClose={() => setShowStationPicker(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  bodyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  prices: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  actions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.md,
  },
  confirmPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  confirmPhotoText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  confirmLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  confirmValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  confirmPrices: {
    marginTop: spacing.md,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  confirmPricesLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  confirmPricesGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  confirmPriceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confirmPriceValue: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  ocrRawText: {
    ...typography.caption,
    color: colors.warning,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
});
