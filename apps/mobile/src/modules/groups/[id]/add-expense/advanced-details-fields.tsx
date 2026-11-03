import { StyleSheet, Text } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  AdvancedDetailsForm,
  AdvancedExpenseType,
} from './expense-payload';

const TYPE_OPTIONS = [
  ['other', 'Otro'],
  ['food', 'Comida'],
  ['stay', 'Alojamiento'],
  ['transport', 'Transporte'],
  ['activity', 'Actividad'],
  ['purchase', 'Compra'],
] as const satisfies readonly (readonly [AdvancedExpenseType, string])[];

const TEXT_FIELDS = [
  ['placeName', 'Lugar o nombre', {}],
  ['address', 'Dirección', {}],
  ['mapUrl', 'Enlace de mapa', { autoCapitalize: 'none', keyboardType: 'url' }],
  ['contactName', 'Persona de contacto', {}],
  ['phone', 'Teléfono', { keyboardType: 'phone-pad' }],
  [
    'email',
    'Correo electrónico',
    { keyboardType: 'email-address', autoCapitalize: 'none' },
  ],
  ['bookingCode', 'Código de reserva', {}],
  ['reservationTime', 'Fecha u hora de reserva', {}],
  ['websiteUrl', 'Sitio web', { autoCapitalize: 'none', keyboardType: 'url' }],
  ['notes', 'Notas', { multiline: true }],
] as const;

type Props = {
  value: AdvancedDetailsForm;
  onChange: (value: AdvancedDetailsForm) => void;
  hasAttachment: boolean;
  onChooseAttachment: () => void;
};

export function AdvancedDetailsFields({
  value,
  onChange,
  hasAttachment,
  onChooseAttachment,
}: Props) {
  return (
    <>
      <Label>Detalles avanzados</Label>
      <Text style={styles.helperText}>
        Agrega información útil para recordar este gasto.
      </Text>
      {TYPE_OPTIONS.map(([type, label]) => (
        <Button
          key={type}
          variant={value.type === type ? 'default' : 'outline'}
          onPress={() => onChange({ ...value, type })}
        >
          <Text style={styles.buttonText}>{label}</Text>
        </Button>
      ))}
      {TEXT_FIELDS.map(([field, placeholder, inputProps]) => (
        <Input
          key={field}
          value={value[field]}
          onChangeText={(text) => onChange({ ...value, [field]: text })}
          placeholder={placeholder}
          {...inputProps}
        />
      ))}
      <Button variant="outline" onPress={onChooseAttachment}>
        <Text style={styles.outlineText}>
          {hasAttachment ? 'Cambiar imagen adjunta' : 'Adjuntar imagen'}
        </Text>
      </Button>
    </>
  );
}

const styles = StyleSheet.create({
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#111827', fontSize: 14, fontWeight: '600' },
  helperText: { color: '#6B7280', fontSize: 13 },
});
