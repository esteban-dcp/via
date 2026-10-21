# Handoff: rediseño de UI de VIA (app Android, Expo)

Estado al 2026-10-19. El backend y la configuración de release ya están endurecidos; lo que sigue es **solo UI/UX**. No cambies contratos de datos (ver "No romper").

## Stack
Expo SDK 56 / RN 0.85, TypeScript, React Navigation (bottom tabs), Zustand, Reanimated, Supabase (auth Google, Postgres+RLS, Edge Functions). Solo Android por ahora (Play Store).
Comandos: `npm install`, `npx tsc --noEmit`, `npx expo start`. Build: `eas build -p android --profile production` (AAB).

## Sistema visual actual (`src/theme.ts`)
Tema oscuro fijo (`userInterfaceStyle: dark`). Tokens: `colors` (background `#011360`, card `#021A70`, primary `#034af8`, accent `#4A7AF8`, textPrimary/Secondary/Muted, success/warning/danger), `spacing`, `radius`, `typography`, `shadows`. Hay hex sueltos que deberían pasar a tokens (App.tsx tab bar, `OnboardingModal` con una paleta vieja `rgba(11,16,32…)`).
Componentes base: `src/components/ui` (Badge, Button, Card, TextField, Toast). Hook de pressed: `src/hooks/useScalePress.ts`.

## Pantallas y archivos
| Pantalla | Archivo | Notas |
|---|---|---|
| Auth (Google) | `src/screens/AuthScreen.tsx` | |
| Home "Mejor" | `src/screens/HomeScreen.tsx` | mejor estación cercana, `FuelCard` |
| Mapa | `src/screens/MapScreen.tsx`, `src/components/MapView.tsx` | Leaflet en WebView (CDN unpkg + tiles CARTO) |
| Contribuir (cámara→recorte→revisión→confirmar) | `src/screens/ContributeScreen.tsx`, `CropTool`, `PriceSelector`, `PhotoPreview`, `StationSelector` | flujo con `useState`, sin stack |
| Perfil | `src/screens/ProfileScreen.tsx` | ranking (`LeaderboardSheet`), eliminar cuenta, privacidad |
| Navbar + FAB "Capturar" | `App.tsx` | barra absoluta con pill flotante |
| Onboarding, AdWall, StationDetailSheet | `src/components/` | |

## Pendientes de UI (priorizados)
Base: `dev/better-interface.md` y `dev/listed-problems.md` (feedback del dueño; están en `.gitignore`, solo existen en esta máquina; léelos primero).
1. **Home:** menos cargada; no repetir "Mejor cerca / mejor estación / mejor precio"; renombrar "Confianza" por algo entendible.
2. **Frescura de precios:** en Ecuador el precio cambia 1 vez al mes (día 12). "Viejo" = no actualizado desde el 12 del mes en curso; reportes del día 12 = "súper fresco". Hoy se marca viejo a los 3 días (copy en inglés). La lógica de `freshness` vive en SQL (`get_nearby_stations`, migración 004) y hay que ajustarla allí.
3. **Compartir:** imagen generada (sin emojis, solo iconos), estilo "racha de Duolingo".
4. **Perfil:** quitar el mapa de fondo (sobrecargado).
5. **Estados faltantes:** vacío/carga/error en Home y Mapa (hoy `catch {}` silencioso), mapa sin red, permiso de ubicación denegado (botón a Ajustes), estación sin precios.
6. **Accesibilidad:** casi no hay `accessibilityLabel/Role` (ya añadidos en tabs y FAB de `App.tsx`); áreas táctiles ≥48dp (refrescar/recentrar mapa 36–44, botones de `StationDetailSheet`, `CropTool`, `AdWall`, `LeaderboardSheet`); `maxFontSizeMultiplier` (hay alturas fijas que rompen con fuente grande); contraste (`primary` sobre `background` es bajo; `textMuted` ya se subió a 0.72).
7. **Teclado/Android:** `OnboardingModal` y el modal de cambiar nombre sin `KeyboardAvoidingView`; revisar insets edge-to-edge (Android 15) con la navbar absoluta.
8. **Rendimiento visual:** 3 WebViews vivas a la vez (Home/Map/Contribute usan el mapa de fondo); `useUserStore()` sin selectores; sin `React.memo` en listas.
9. **Strings:** todo está hardcodeado en español; hay errores en inglés que llegan al usuario (`Failed to create profile`, `Unknown camera error`).
10. Pantalla de "Acerca de" con atribución OSM/CARTO.

## No romper (contrato con el backend)
- Los créditos (`access_remaining`) los **suma un trigger** al insertar un reporte; el cliente solo llama `consume_access` (RPC) y luego `refreshProfile()`. No reintroducir `grant_access`.
- Reportes: insertar con `status: 'pending'` y `user_id = profile.id`; el admin aprueba en la web (`/admin`) vía `approve_report`/`reject_report`.
- Ranking lee la vista `public_profiles`, no `users` (RLS: cada usuario solo ve su fila).
- `users` solo permite actualizar `display_name`, `preferred_fuel`, `expo_push_token`.
- Favoritos usan `profile.id` (no `auth.uid()`).
- Eliminar cuenta: RPC `delete_my_account` (requisito de Play).
- Tab names usados por la navegación y el tap de notificaciones: `Home`, `Contribute`, `Map`, `Profile`.

## Estado de release (no es UI, pero bloquea Play)
Hecho: migraciones 007–010 aplicadas en Supabase, edge function `notify-favorites` con secreto de webhook, permisos Android limpios, targetSdk 36, `eas.json` con AAB + autoIncrement, web en `https://via.inntratec.com` (landing, `/privacy`, `/terms`, `/admin` con Google).
Falta: `google-services.json` + clave FCM en EAS; secretos en EAS (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_OCR_SPACE_API_KEY`); mover OCR.space a una Edge Function (la clave va en el bundle); Data Safety y correo de contacto en Play Console; feature graphic 1024x500 y capturas; bucket `reports` público (pasar a privado con URLs firmadas); Sentry/ErrorBoundary; tests de `ocr.ts` y `pricing.ts`; `npx expo install --check` (10 paquetes desactualizados).

## Cómo probar
`npx tsc --noEmit` debe quedar limpio. Probar en dispositivo real: primera sesión (onboarding), permisos denegados, sin red, fuente grande + TalkBack, flujo de reporte completo con una cuenta normal y aprobación desde `/admin`.
