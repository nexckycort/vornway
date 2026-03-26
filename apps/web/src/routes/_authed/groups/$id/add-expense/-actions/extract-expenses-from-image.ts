import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createServerFn } from '@tanstack/react-start';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { serverEnv } from '~/config/env.server';
import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'AED'] as const;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const ExtractExpensesFromImageInputSchema = z.object({
  groupId: z.string(),
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
});

const ExtractedExpenseItemSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  notes: z.string().max(240).nullable(),
});

const ExtractedExpensesSchema = z.object({
  expenses: z.array(ExtractedExpenseItemSchema).max(20),
  notes: z.string().max(240).nullable(),
});

interface ExtractExpensesFromImageResponse {
  success: boolean;
  expenses?: Array<{
    description: string;
    amount: number;
    currency: (typeof SUPPORTED_CURRENCIES)[number];
    notes: string | null;
  }>;
  notes?: string | null;
  error?: string;
}

export const extractExpensesFromImage = createServerFn({ method: 'POST' })
  .inputValidator(ExtractExpensesFromImageInputSchema)
  .handler(async ({ data }): Promise<ExtractExpensesFromImageResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const membership = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: { id: true },
      });

      if (!membership) {
        return {
          success: false,
          error: 'No tienes acceso a este grupo',
        };
      }

      if (!data.mimeType.startsWith('image/')) {
        return {
          success: false,
          error: 'El archivo debe ser una imagen',
        };
      }

      const imageBuffer = Buffer.from(data.imageBase64, 'base64');

      if (imageBuffer.byteLength === 0) {
        return {
          success: false,
          error: 'No se pudo leer la imagen',
        };
      }

      if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        return {
          success: false,
          error: 'La imagen es muy pesada. Usa una foto de hasta 8 MB.',
        };
      }

      const geminiApiKey = serverEnv.AI_API_KEY ?? serverEnv.AI_API_KEY;

      if (!geminiApiKey) {
        return {
          success: false,
          error: 'Configura AI_API_KEY para usar la importación de gastos',
        };
      }

      const google = createGoogleGenerativeAI({
        apiKey: geminiApiKey,
      });

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        temperature: 0,
        output: Output.object({
          schema: ExtractedExpensesSchema,
          name: 'expenses_from_image',
          description:
            'Lista de varios gastos detectados desde una captura o imagen',
        }),
        system:
          'Extrae multiples gastos desde una captura de pantalla, lista, tabla, nota o factura. Devuelve solo gastos reales y omite encabezados, subtotales, balances, fechas aisladas o texto decorativo.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'Analiza esta imagen y devuelve una lista de gastos listos para crear en la app.',
                  'Cada gasto debe incluir descripcion corta, monto y moneda.',
                  `Las monedas validas son: ${SUPPORTED_CURRENCIES.join(', ')}.`,
                  'Si ves una lista con varios renglones, devuelve un gasto por cada renglon que represente una compra o consumo.',
                  'No inventes gastos.',
                  'No devuelvas un unico total global si la imagen claramente muestra varios gastos individuales.',
                  'Si hay textos dudosos o la imagen esta incompleta, explicalo en notes del item o en notes generales.',
                  `Archivo: ${data.fileName ?? 'imagen'}.`,
                ].join(' '),
              },
              {
                type: 'image',
                image: imageBuffer,
                mediaType: data.mimeType,
              },
            ],
          },
        ],
      });

      const expenses = result.output.expenses
        .map((expense) => ({
          description: expense.description.trim(),
          amount: expense.amount,
          currency: expense.currency,
          notes: expense.notes,
        }))
        .filter(
          (expense) =>
            expense.description.length > 0 &&
            Number.isFinite(expense.amount) &&
            expense.amount > 0,
        );

      if (expenses.length === 0) {
        return {
          success: false,
          error:
            'No pude detectar gastos individuales en esa imagen. Prueba con una captura más clara o recortada.',
        };
      }

      return {
        success: true,
        expenses,
        notes: result.output.notes,
      };
    } catch (error) {
      console.error('Error extracting expenses from image:', error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo analizar la captura de gastos',
      };
    }
  });
