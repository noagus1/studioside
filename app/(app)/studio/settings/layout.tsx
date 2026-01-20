import { SettingsCacheProvider } from '@/components/settings/SettingsCacheProvider'

export default function StudioSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SettingsCacheProvider>
      <div className="w-full">{children}</div>
    </SettingsCacheProvider>
  )
}
