import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    return NextResponse.redirect(`${origin}/`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
