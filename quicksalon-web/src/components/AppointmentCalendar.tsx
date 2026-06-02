import { type CSSProperties, Fragment, useMemo } from 'react'
import type { AppointmentDisplay } from '../types'

interface AppointmentCalendarProps {
  weekStart: Date
  appointments: AppointmentDisplay[]
  onSelectAppointment: (appointment: AppointmentDisplay) => void
}

const SLOT_HEIGHT = 42
const START_HOUR = 8
const END_HOUR = 20
const SLOT_MINUTES = 30
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function getDayIndex(weekStart: Date, appointmentDate: string) {
  const date = startOfDay(new Date(appointmentDate))
  return Math.floor((date.getTime() - startOfDay(weekStart).getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusClass(status: string) {
  switch (status) {
    case 'Confirmed': return 'calendar-event-confirmed'
    case 'InProgress': return 'calendar-event-progress'
    case 'Completed': return 'calendar-event-completed'
    case 'Cancelled': return 'calendar-event-cancelled'
    case 'NoShow': return 'calendar-event-noshow'
    default: return 'calendar-event-booked'
  }
}

function buildLayout(weekStart: Date, appointments: AppointmentDisplay[]) {
  const days = Array.from({ length: 7 }, (_, dayIndex) => ({
    dayIndex,
    date: addDays(weekStart, dayIndex),
    appointments: appointments
      .filter((appointment) => getDayIndex(weekStart, appointment.appointmentDate) === dayIndex)
      .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime)),
  }))

  return days.map((day) => {
    const active: Array<{ lane: number; end: number }> = []
    const clusterMap = new Map<number, AppointmentDisplay[]>()
    const layout = day.appointments.map((appointment, index) => {
      const start = timeToMinutes(appointment.startTime)
      const end = timeToMinutes(appointment.endTime)
      for (let i = active.length - 1; i >= 0; i -= 1) {
        if (active[i].end <= start) {
          active.splice(i, 1)
        }
      }

      let lane = 0
      while (active.some((entry) => entry.lane === lane)) {
        lane += 1
      }

      active.push({ lane, end })
      const overlapping = day.appointments.filter((candidate) => {
        const candidateStart = timeToMinutes(candidate.startTime)
        const candidateEnd = timeToMinutes(candidate.endTime)
        return candidateStart < end && candidateEnd > start
      })
      clusterMap.set(index, overlapping)

      return { appointment, lane, overlapCount: overlapping.length }
    })

    return { ...day, layout, clusterMap }
  })
}

export function AppointmentCalendar({ weekStart, appointments, onSelectAppointment }: AppointmentCalendarProps) {
  const days = useMemo(() => buildLayout(weekStart, appointments), [appointments, weekStart])
  const timeLabels = Array.from({ length: TOTAL_SLOTS }, (_, slotIndex) => {
    const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  })

  return (
    <>
      <div className="week-calendar">
        <div className="calendar-corner" />
        {days.map((day) => (
          <div key={day.dayIndex} className="calendar-day-header">{formatWeekday(day.date)}</div>
        ))}

        {timeLabels.map((label) => (
          <Fragment key={label}>
            <div className="calendar-time-label">{label}</div>
            {days.map((day) => (
              <div key={`${day.dayIndex}-${label}`} className="calendar-slot-cell" />
            ))}
          </Fragment>
        ))}

        <div className="calendar-events-layer">
          {days.map((day) => (
            <div key={day.dayIndex} className="calendar-day-events" style={{ gridColumn: day.dayIndex + 1 }}>
              {day.layout.map(({ appointment, lane, overlapCount }, index) => {
                if (lane > 2) {
                  return null
                }

                const startMinutes = timeToMinutes(appointment.startTime) - START_HOUR * 60
                const durationMinutes = Math.max(timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime), SLOT_MINUTES)
                const hiddenCount = Math.max(overlapCount - 3, 0)
                const width = `calc(${100 / Math.min(overlapCount, 3)}% - 6px)`
                const left = `calc(${lane * (100 / Math.min(overlapCount, 3))}% + 3px)`

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    className={`calendar-event ${getStatusClass(appointment.status)}`}
                    style={{
                      top: `${(startMinutes / SLOT_MINUTES) * SLOT_HEIGHT}px`,
                      height: `${(durationMinutes / SLOT_MINUTES) * SLOT_HEIGHT - 4}px`,
                      left,
                      width,
                    } as CSSProperties}
                    onClick={() => onSelectAppointment(appointment)}
                  >
                    <strong>{appointment.startTime}</strong>
                    <span>{appointment.customerName}</span>
                    <small>{appointment.serviceName}</small>
                    {hiddenCount > 0 && lane === 2 && day.clusterMap.get(index)?.[0]?.id === appointment.id ? <em>+{hiddenCount} more</em> : null}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-mobile-stack">
        {days.map((day) => (
          <section key={day.dayIndex} className="calendar-mobile-day panel">
            <h3>{formatWeekday(day.date)}</h3>
            {day.appointments.length === 0 ? <p className="hint">No appointments</p> : day.appointments.map((appointment) => (
              <button key={appointment.id} type="button" className={`calendar-mobile-card ${getStatusClass(appointment.status)}`} onClick={() => onSelectAppointment(appointment)}>
                <strong>{appointment.startTime} - {appointment.endTime}</strong>
                <span>{appointment.customerName}</span>
                <small>{appointment.serviceName}</small>
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}