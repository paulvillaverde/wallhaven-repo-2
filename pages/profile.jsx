import React from 'react'
import ProfilePage from '../src/components/ProfilePage'
import { useAuth } from '../src/hooks/useAuth'

export default function Profile() {
  const { user } = useAuth()
  // keep API key usage consistent with original app
  const apiKey = 'JKtOMDLrvv6sLV5C0GYxyRLUlpPGWAry'

  return <ProfilePage user={user} onClose={() => {}} apiKey={apiKey} />
}
