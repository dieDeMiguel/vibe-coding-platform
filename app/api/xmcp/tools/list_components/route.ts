import { NextResponse } from 'next/server'
import { fakeListComponents } from '@/lib/xmcp/fake-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const response = await fakeListComponents(body)
    return NextResponse.json(response)
  } catch (error) {
    console.error('XMCP list_components error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}