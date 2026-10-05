import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function readInviteCode(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/(?:join\.vornway\.com|\/i\/)(?:\/)?([^/?#]+)/i);
  return match?.[1] ?? trimmed;
}

export function QrScanner({
  open,
  onOpenChange,
  onScanned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanned: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setHandled(false);
        onOpenChange(next);
      }}
    >
      <DialogContent style={styles.content}>
        <DialogHeader>
          <DialogTitle>Escanear invitación</DialogTitle>
          <DialogDescription>
            Apunta la cámara al código QR del espacio.
          </DialogDescription>
        </DialogHeader>
        {!permission?.granted ? (
          <View style={styles.permission}>
            <Text style={styles.copy}>
              Necesitamos acceso a la cámara para leer invitaciones.
            </Text>
            <Button onPress={() => void requestPermission()}>
              <Text style={styles.buttonText}>Permitir cámara</Text>
            </Button>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={
              handled
                ? undefined
                : ({ data }) => {
                    setHandled(true);
                    const code = readInviteCode(data);
                    if (!code) {
                      Alert.alert(
                        'Código inválido',
                        'Intenta con otro código.',
                      );
                      setHandled(false);
                      return;
                    }
                    onOpenChange(false);
                    onScanned(code);
                  }
            }
          />
        )}
        <Button variant="outline" onPress={() => onOpenChange(false)}>
          <Text style={styles.outlineText}>Cerrar</Text>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, margin: 16, padding: 16 },
  camera: { borderRadius: 20, height: 280, overflow: 'hidden', width: '100%' },
  permission: { gap: 12, paddingVertical: 24 },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
