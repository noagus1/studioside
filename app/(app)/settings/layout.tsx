import { SettingsContentWrapper } from './SettingsContentWrapper'
import { SettingsCacheProvider } from '@/components/settings/SettingsCacheProvider'

export default function SettingsLayout({
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

