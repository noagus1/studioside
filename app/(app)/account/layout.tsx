import { SettingsCacheProvider } from '@/components/settings/SettingsCacheProvider'
import { SettingsContentWrapper } from '../settings/SettingsContentWrapper'

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SettingsCacheProvider>
      <SettingsContentWrapper>
        {children}
      </SettingsContentWrapper>
    </SettingsCacheProvider>
  )
}

