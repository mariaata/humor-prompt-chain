"use client"

import { useState } from "react"
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [error, setError] = useState("")
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { 
        redirectTo: `${window.location.origin}/auth/callback` 
      },
    })
    if (error) setError(error.message)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #1e1b4b, #581c87, #1e1b4b)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '2.5rem',
        borderRadius: '1.5rem',
        border: '1px solid rgba(255,255,255,0.2)',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: '5rem',
          height: '5rem',
          background: 'linear-gradient(to bottom right, #a855f7, #ec4899)',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <span style={{fontSize: '2.5rem'}}>🎭</span>
        </div>
        <h1 style={{color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>
          Prompt Chain Tool
        </h1>
        <p style={{color: '#d1d5db', marginBottom: '1.5rem'}}>Manage Humor Flavors</p>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            padding: '1rem',
            borderRadius: '0.5rem',
            color: '#fca5a5',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}
        <button
          onClick={signIn}
          style={{
            width: '100%',
            padding: '1rem',
            background: 'white',
            color: 'black',
            fontWeight: 'bold',
            borderRadius: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.125rem',
          }}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
