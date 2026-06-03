import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, LoadingState } from '../components/StateBlocks'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { TenantSettings } from '../types'

const emptySettings: TenantSettings = {
  tenantId: '',
  salonName: '',
  logoUrl: '',
  phone: '',
  email: '',
  address: '',
  openingHours: '',
  defaultCurrency: 'GHS',
  taxRate: 0,
  receiptFooter: '',
  enableAppointmentReminders: false,
  reminderSettings: {
    autoReminderEnabled: false,
    leadTime: '2h',
    defaultChannel: 'SMS',
    numberPrefix: '',
    messageTemplate: 'Hi {customerName}, reminder: your {service} appointment is on {date} at {time} with {employeeName} at {salonName}. Reply STOP to opt out.',
  },
}

const DEFAULT_TEMPLATE = 'Hi {customerName}, reminder: your {service} appointment is on {date} at {time} with {employeeName} at {salonName}. Reply STOP to opt out.'

function normalizeSettings(input: TenantSettings): TenantSettings {
  return {
    ...input,
    reminderSettings: {
      autoReminderEnabled: input.reminderSettings?.autoReminderEnabled ?? false,
      leadTime: input.reminderSettings?.leadTime || '2h',
      defaultChannel: input.reminderSettings?.defaultChannel || 'SMS',
      numberPrefix: input.reminderSettings?.numberPrefix ?? '',
      messageTemplate: input.reminderSettings?.messageTemplate || DEFAULT_TEMPLATE,
    },
  }
}

export function SettingsPage() {
  const { hasAnyRole } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<TenantSettings>(emptySettings)
  const [remindersExpanded, setRemindersExpanded] = useState(false)

  const canManage = hasAnyRole('Admin', 'SystemAdmin', 'SalonOwner')

  useEffect(() => {
    api<TenantSettings>('/api/settings/tenant')
      .then((response) => setSettings(normalizeSettings(response)))
      .catch(() => {
        setError('Unable to load tenant settings.')
        showToast('Unable to load tenant settings.', 'error')
      })
      .finally(() => setLoading(false))
  }, [])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return
    try {
      await api<TenantSettings>('/api/settings/tenant', {
        method: 'PUT',
        body: JSON.stringify(settings),
      })
      showToast('Settings saved successfully.', 'success')
    } catch {
      showToast('Failed to save settings.', 'error')
    }
  }

  async function saveReminderSettings() {
    if (!canManage) return
    try {
      const payload = {
        autoReminderEnabled: settings.reminderSettings.autoReminderEnabled,
        leadTime: settings.reminderSettings.leadTime || '2h',
        defaultChannel: settings.reminderSettings.defaultChannel || 'SMS',
        numberPrefix: settings.reminderSettings.numberPrefix ?? '',
        messageTemplate: settings.reminderSettings.messageTemplate || DEFAULT_TEMPLATE,
      }

      await api<TenantSettings>('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      setSettings((current) => ({
        ...current,
        reminderSettings: {
          ...current.reminderSettings,
          ...payload,
        },
      }))
      showToast('Reminder settings saved successfully.', 'success')
    } catch {
      showToast('Failed to save reminder settings.', 'error')
    }
  }

  if (loading) return <LoadingState message="Loading settings..." />
  if (error) return <ErrorState message={error} />

  return (
    <section>
      <PageHeader title="Tenant Settings" subtitle="Manage salon profile, receipts, and reminder defaults" />
      <form onSubmit={save} className="panel form-grid">
        <FormField label="Salon Name"><input value={settings.salonName ?? ''} onChange={(e) => setSettings((x) => ({ ...x, salonName: e.target.value }))} disabled={!canManage} /></FormField>
        <FormField label="Logo URL"><input value={settings.logoUrl ?? ''} onChange={(e) => setSettings((x) => ({ ...x, logoUrl: e.target.value }))} disabled={!canManage} /></FormField>
        <FormField label="Phone"><input value={settings.phone ?? ''} onChange={(e) => setSettings((x) => ({ ...x, phone: e.target.value }))} disabled={!canManage} /></FormField>
        <FormField label="Email"><input value={settings.email ?? ''} onChange={(e) => setSettings((x) => ({ ...x, email: e.target.value }))} disabled={!canManage} /></FormField>
        <FormField label="Address"><input value={settings.address ?? ''} onChange={(e) => setSettings((x) => ({ ...x, address: e.target.value }))} disabled={!canManage} /></FormField>
        <FormField label="Opening Hours"><input value={settings.openingHours ?? ''} onChange={(e) => setSettings((x) => ({ ...x, openingHours: e.target.value }))} disabled={!canManage} /></FormField>
        <FormField label="Currency"><input value={settings.defaultCurrency} onChange={(e) => setSettings((x) => ({ ...x, defaultCurrency: e.target.value.toUpperCase() }))} disabled={!canManage} /></FormField>
        <FormField label="Tax/VAT %"><input type="number" value={settings.taxRate} onChange={(e) => setSettings((x) => ({ ...x, taxRate: Number(e.target.value) }))} disabled={!canManage} /></FormField>
        <FormField label="Receipt Footer"><input value={settings.receiptFooter ?? ''} onChange={(e) => setSettings((x) => ({ ...x, receiptFooter: e.target.value }))} disabled={!canManage} /></FormField>
        <label className="checkbox-row">
          <input type="checkbox" checked={settings.enableAppointmentReminders} onChange={(e) => setSettings((x) => ({ ...x, enableAppointmentReminders: e.target.checked }))} disabled={!canManage} />
          <span>Enable appointment reminders</span>
        </label>
        <button type="submit" disabled={!canManage}><Save size={16} /> Save Settings</button>
      </form>

      <section className="panel settings-collapsible">
        <button type="button" className="collapsible-trigger" onClick={() => setRemindersExpanded((value) => !value)}>
          <span>Reminders</span>
          <span>{remindersExpanded ? '−' : '+'}</span>
        </button>
        {remindersExpanded ? (
          <div className="form-grid reminder-settings-panel">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={settings.reminderSettings.autoReminderEnabled}
                onChange={(e) => setSettings((current) => ({
                  ...current,
                  enableAppointmentReminders: e.target.checked,
                  reminderSettings: { ...current.reminderSettings, autoReminderEnabled: e.target.checked },
                }))}
                disabled={!canManage}
              />
              <span>Auto-reminder</span>
            </label>
            <FormField label="Reminder lead time">
              <select
                value={settings.reminderSettings.leadTime}
                onChange={(e) => setSettings((current) => ({ ...current, reminderSettings: { ...current.reminderSettings, leadTime: e.target.value } }))}
                disabled={!canManage}
              >
                <option value="1h">1 hour before</option>
                <option value="2h">2 hours</option>
                <option value="4h">4 hours</option>
                <option value="24h">24 hours</option>
                <option value="48h">48 hours</option>
              </select>
            </FormField>
            <div className="reminder-channel-row">
              {(['SMS', 'WhatsApp', 'Email'] as const).map((channel) => (
                <label key={channel} className="reminder-channel-option">
                  <input
                    type="radio"
                    name="default-reminder-channel"
                    checked={settings.reminderSettings.defaultChannel === channel}
                    onChange={() => setSettings((current) => ({ ...current, reminderSettings: { ...current.reminderSettings, defaultChannel: channel } }))}
                    disabled={!canManage}
                  />
                  <span>{channel}</span>
                </label>
              ))}
            </div>
            <FormField label="SMS/WhatsApp number prefix">
              <input
                value={settings.reminderSettings.numberPrefix ?? ''}
                onChange={(e) => setSettings((current) => ({ ...current, reminderSettings: { ...current.reminderSettings, numberPrefix: e.target.value } }))}
                disabled={!canManage}
              />
            </FormField>
            <label className="field">
              <span>Reminder message template</span>
              <textarea
                rows={6}
                value={settings.reminderSettings.messageTemplate}
                onChange={(e) => setSettings((current) => ({ ...current, reminderSettings: { ...current.reminderSettings, messageTemplate: e.target.value } }))}
                disabled={!canManage}
              />
            </label>
            <button type="button" onClick={saveReminderSettings} disabled={!canManage}>Save Reminder Settings</button>
          </div>
        ) : null}
      </section>

      {!canManage ? <p className="hint">You do not have permission to edit settings.</p> : null}
    </section>
  )
}
