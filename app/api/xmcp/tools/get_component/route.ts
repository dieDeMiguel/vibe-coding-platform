import { NextResponse } from 'next/server'
import { fakeGetComponent } from '@/lib/xmcp/fake-server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const response = await fakeGetComponent(body)
    return NextResponse.json(response)
  } catch (error) {
    console.error('XMCP get_component error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}