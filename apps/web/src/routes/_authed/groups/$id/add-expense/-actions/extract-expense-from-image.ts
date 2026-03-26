import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createServerFn } from '@tanstack/react-start';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { serverEnv } from '~/config/env.server';
import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const SUPPORTED_CURRENCIES = ['COP', 'USD', 'EUR', 'AED'] as const;
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

const ExtractExpenseFromImageInputSchema = z.object({
  groupId: z.string(),
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
});

const ExtractedExpenseSchema = z.object({
  description: z.string().min(1).nullable(),
  amount: z.number().positive().nullable(),
  currency: z.enum(SUPPORTED_CURRENCIES).nullable(),
  notes: z.string().max(240).nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
});

interface ExtractExpenseFromImageResponse {
  success: boolean;
  expense?: {
    description: string;
    amount: number;
    currency: (typeof SUPPORTED_CURRENCIES)[number];
    notes: string | null;
    confidence: 'high' | 'medium' | 'low';
  };
  error?: string;
}

export const extractExpenseFromImage = createServerFn({ method: 'POST' })
  .inputValidator(ExtractExpenseFromImageInputSchema)
  .handler(async ({ data }): Promise<ExtractExpenseFromImageResponse> => {
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
          error: 'Configura AI_API_KEY para usar el escaneo de gastos',
        };
      }

      const google = createGoogleGenerativeAI({
        apiKey: geminiApiKey,
      });

      const result = await generateText({
        model: google('gemini-2.5-flash'),
        temperature: 0,
        output: Output.object({
          schema: ExtractedExpenseSchema,
          name: 'expense_from_image',
          description:
            'Datos estructurados de un gasto detectado desde una imagen',
        }),
        system:
          'Extrae datos de gastos desde fotos de recibos, facturas o capturas. Responde solo con el objeto solicitado.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'Analiza esta imagen y devuelve un gasto listo para precargar en un formulario.',
                  'Extrae el titulo o descripcion principal del comercio o concepto del gasto.',
                  'Extrae el monto final total realmente pagado. Si hay subtotal, impuestos y total, usa el total final.',
                  `Normaliza la moneda a una de estas opciones: ${SUPPORTED_CURRENCIES.join(', ')}.`,
                  'Si la moneda no se ve con suficiente claridad, devuelve null en currency.',
                  'Si no puedes identificar con claridad la descripcion o el monto final, devuelve null en el campo correspondiente.',
                  'En notes resume cualquier duda relevante, por ejemplo si el monto estaba borroso o si habia varios totales.',
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

      if (
        !result.output.description ||
        !result.output.amount ||
        !result.output.currency
      ) {
        return {
          success: false,
          error:
            'No pude extraer descripcion, monto y moneda con suficiente claridad. Prueba con una foto mas nítida.',
        };
      }

      return {
        success: true,
        expense: {
          description: result.output.description.trim(),
          amount: result.output.amount,
          currency: result.output.currency,
          notes: result.output.notes,
          confidence: result.output.confidence,
        },
      };
    } catch (error) {
      console.error('Error extracting expense from image:', error);

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo analizar la imagen del gasto',
      };
    }
  });
