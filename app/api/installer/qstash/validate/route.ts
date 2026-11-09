import { NextRequest, NextResponse } from 'next/server';
import { detectQStashBaseUrl, describeQStashError } from '@/lib/installer/qstash-region';

/**
 * POST /api/installer/qstash/validate
 *
 * Valida o token do QStash fazendo uma request à API.
 * Usado no step 4 do wizard de instalação.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    // Validação básica
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token QStash é obrigatório' },
        { status: 400 }
      );
    }

    // Detecta a região (US/EU) testando os endpoints do QStash
    const result = await detectQStashBaseUrl(token.trim());
    if (!result.ok) {
      return NextResponse.json(
        { error: describeQStashError(result) },
        { status: result.reason === 'network' ? 502 : 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Token QStash válido',
      baseUrl: result.baseUrl,
    });

  } catch (error) {
    console.error('[installer/qstash/validate] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno ao validar token' },
      { status: 500 }
    );
  }
}
