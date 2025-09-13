import { NextResponse } from 'next/server';
import { getComponent } from '@/lib/mcp/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const component = searchParams.get('component') || 'Button';
    const variant = searchParams.get('variant') || undefined;
    
    console.log(`🧪 Testing getComponent('${component}', '${variant}')`);
    
    const result = await getComponent(component, variant);
    
    console.log(`✅ getComponent success:`, result);
    
    return NextResponse.json({
      success: true,
      component,
      variant,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`❌ getComponent error:`, error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
