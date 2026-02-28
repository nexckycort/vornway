import { Text, View } from '@/tw';

export default function CreateScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#F7F8FC] px-6">
      <Text className="text-3xl font-black text-slate-900">Nuevo gasto</Text>
      <Text className="mt-2 text-lg text-slate-500">Accion mock del boton central.</Text>
    </View>
  );
}
