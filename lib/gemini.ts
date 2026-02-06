
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_AI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
});

const ACCOUNTING_STRUCTURE_RULES = `
Debes seguir RIGUROSAMENTE esta estructura de códigos jerárquicos (X-XX-XXX-XXXX):
- Nivel 1 (X): Clase (1: Activo, 2: Pasivo, 3: PN, 4: Ingresos, 5: Egresos)
- Nivel 2 (XX): Cuenta Mayor (ej: 01, 02)
- Nivel 3 (XXX): Subcuenta (ej: 001, 002)
- Nivel 4 (XXXX): Cuenta Auxiliar (ej: 0001, 0002)

REQUISITOS DE FORMATO:
1. Usa SIEMPRE el guion (-) como separador.
2. Completa con ceros a la izquierda según la longitud definida (XX, XXX, XXXX).
3. Ejemplo de cuenta de ingresos: "4-01-001-0001".
4. Ejemplo de cuenta de egresos: "5-01-002-0005".
`;

const generateSystemPrompt = (context: { entities: string[], accounts: string[], seats: string[] }) => `
Eres un asistente financiero argentino ultra-preciso. Tu trabajo es interpretar transcripciones de voz y estructurarlas en JSON.

IMPORTANTE: Prioriza los siguientes nombres si el usuario los menciona:
- ENTIDADES: ${context.entities.join(', ')}
- CUENTAS BANCARIAS: ${context.accounts.join(', ')}
- ASIENTOS CONTABLES: ${context.seats.join(', ')}

Reglas de Oro:
1. 'description': Pon aquí el texto residual informativo (detalles extra, motivo específico). ELIMINA del texto el monto, la moneda, el banco y la entidad mencionada. Si no queda nada relevante, deja una descripción breve del gasto.
2. 'entityKeyword': Usa el nombre EXACTO de la lista ENTIDADES si coincide.
3. 'bankKeyword': Usa el nombre EXACTO de CUENTAS BANCARIAS si coincide.
4. 'categoryKeyword': Usa el nombre EXACTO de ASIENTOS CONTABLES si coincide.
5. 'amount', 'currency', 'type', 'date' (Hoy es ${new Date().toISOString().split('T')[0]}).
6. Retorna SOLO JSON.

Ejemplo: "500 verdes de Orange al nacion por servicios de marketing" -> { "amount": 500, "currency": "USD", "entityKeyword": "Orange", "bankKeyword": "Banco Nación", "description": "Servicios de marketing", "type": "INGRESO" }
`;

const generatePlanPrompt = (tipoActividad: string) => `
Eres un contador profesional experto en Argentina. Tu tarea es generar un Plan de Cuentas (Asientos Contables) completo y profesional para un usuario que realiza la actividad de: "${tipoActividad}".

${ACCOUNTING_STRUCTURE_RULES}

REQUISITOS ADICIONALES:
1. Genera al menos 20-30 cuentas esenciales para la actividad especificada.
2. Incluye cuentas comunes (Caja, Bancos, Ventas, Gastos Varios) y específicas para "${tipoActividad}".
3. Formato de salida: Un Array de objetos JSON: [{ "codigo": "1-01-001-0001", "nombre": "Caja Central", "descripcion": "Dinero en efectivo" }, ...]
4. Retorna SOLO el JSON, sin bloques de código ni texto adicional.
`;

const generateSuggestPrompt = (transaccion: string, contexto: string, entidad?: string) => `
Como contador profesional, analiza la siguiente transacción y sugiere el Asiento Contable más apropiado de la lista proporcionada.

Transacción: "${transaccion}"
${entidad ? `Entidad Relacionada: "${entidad}"` : ''}
Contexto del usuario (Actividad): "${contexto}"

${ACCOUNTING_STRUCTURE_RULES}

Cuentas disponibles (Formato: ID|Codigo|Nombre):
`;

export async function processVoiceWithGemini(text: string, context: { entities: string[], accounts: string[], seats: string[] }) {
    if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY no configurada');
    }

    const prompt = `Analiza este texto: "${text}"`;

    try {
        const result = await model.generateContent([
            generateSystemPrompt(context),
            prompt
        ]);
        const response = await result.response;
        const jsonString = response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error detallado Gemini (Voice):', error);
        return null;
    }
}

export async function generatePlanContableWithGemini(tipoActividad: string) {
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no configurada');

    try {
        const result = await model.generateContent(generatePlanPrompt(tipoActividad));
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error detallado Gemini (Plan):', error);
        return null;
    }
}

export async function suggestAsientoWithGemini(
    transaccion: { descripcion: string, tipo: string },
    actividad: string,
    asientos: { id: string, codigo: string, nombre: string }[],
    entidad?: string
) {
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no configurada');

    const asientosList = asientos.map(a => `${a.id}|${a.codigo}|${a.nombre}`).join('\n');
    const prompt = `${generateSuggestPrompt(transaccion.descripcion, actividad, entidad)}\n${asientosList}\n\nResponde SOLO con el ID del asiento seleccionado.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error('Error sugiriendo asiento:', error);
        return null;
    }
}

export async function suggestNewAsientoWithGemini(
    proposito: string,
    entidad: string,
    actividad: string,
    codigosExistentes: string[] = []
) {
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no configurada');

    const prompt = `
Eres un contador profesional experto en Argentina. Tu tarea es sugerir el NOMBRE y el CÓDIGO ideal para un nuevo asiento contable (cuenta) basado en el propósito descrito.

Propósito: "${proposito}"
Entidad / Negocio: "${entidad}"
Tipo de Actividad General: "${actividad}"

${ACCOUNTING_STRUCTURE_RULES}

CÓDIGOS YA EXISTENTES (NO USAR ESTOS):
${codigosExistentes.length > 0 ? codigosExistentes.join(', ') : 'Ninguno'}

REGLA CRÍTICA DE CORRELATIVIDAD:
Tu sugerencia DEBE ser el número correlativo siguiente disponible dentro de la Clase y Mayor que corresponda según el propósito y la entidad. Por ejemplo, si ya existe el "4-01-001-0002" para una actividad similar, tu sugerencia debería ser "4-01-001-0003".

Retorna SOLO un objeto JSON con el siguiente formato:
{
  "codigo": "X-XX-XXX-XXXX",
  "nombre": "Nombre Sugerido",
  "descripcion": "Breve descripción contable"
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        console.log('DEBUG Gemini (New Asiento) JSON Raw:', jsonString);

        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error detallado Gemini (New Asiento):', error);
        return null;
    }
}
