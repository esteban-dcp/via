import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from './src/components/ui/Text';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from './src/screens/HomeScreen';
import { ContributeScreen } from './src/screens/ContributeScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { useUserStore } from './src/state/userStore';
import { colors } from './src/theme';
import { TabBar } from './src/components/TabBar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { ToastContainer } from './src/components/ui/Toast';
import { registerForPushNotifications, savePushToken, addNotificationResponseReceivedListener } from './src/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

const Tab = createBottomTabNavigator();

const AppTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{
      headerShown: false,
      animation: 'fade',
    }}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Mejor' }} />
    <Tab.Screen name="Contribute" component={ContributeScreen} options={{ title: 'Contribuir' }} />
    <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Mapa' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
  </Tab.Navigator>
);

const navigationRef = createNavigationContainerRef();

export default function App() {
  const { session, profile, bootstrap, status, error } = useUserStore();
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const notifListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    const unsubscribe = bootstrap();
    return () => {
      unsubscribe.then((fn) => fn()).catch(() => {});
    };
  }, [bootstrap]);

  // Register push notifications when session + profile are ready
  useEffect(() => {
    if (!session || !profile) return;
    registerForPushNotifications()
      .then((token) => {
        if (token) savePushToken(profile.id, token).catch(() => {});
      })
      .catch(() => {});
  }, [session, profile]);

  // Handle notification tap - navigate to map
  useEffect(() => {
    notifListener.current = addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) navigationRef.navigate('Map' as never);
    });
    return () => notifListener.current?.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (status === 'idle' || status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (status === 'error' && !session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
          {error ?? 'No se pudo iniciar la aplicación.'}
        </Text>
        <Pressable
          onPress={() => bootstrap()}
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          style={{ minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accent }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer ref={navigationRef}>
        {session ? <AppTabs /> : <AuthScreen />}
      </NavigationContainer>
      <ToastContainer />
    </SafeAreaProvider>
  );
}
