import type { StravaActivity } from "@/lib/strava/client"
import type { TablesInsert } from "@/lib/types/database.types"
import type { Discipline } from "@/lib/types/domain"

const SPORT_TO_DISCIPLINE: Record<string, Discipline> = {
  Swim: "swim",
  Ride: "bike",
  VirtualRide: "bike",
  EBikeRide: "bike",
  MountainBikeRide: "bike",
  EMountainBikeRide: "bike",
  GravelRide: "bike",
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  WeightTraining: "strength",
  Workout: "strength",
  Crossfit: "strength",
  HighIntensityIntervalTraining: "strength",
}

export function mapDiscipline(activity: Pick<StravaActivity, "sport_type" | "type">): Discipline {
  const sport = activity.sport_type ?? activity.type ?? ""
  return SPORT_TO_DISCIPLINE[sport] ?? "other"
}

function formatMinSec(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds)
  const minutes = Math.floor(rounded / 60)
  const seconds = rounded % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

// avg_pace_or_power is a free-text column: pace for foot/water sports, power
// (or speed when there is no power meter) for cycling.
export function formatPaceOrPower(
  discipline: Discipline,
  activity: Pick<StravaActivity, "average_speed" | "average_watts">
): string | null {
  const speed = activity.average_speed
  if (discipline === "run" && speed && speed > 0) return `${formatMinSec(1000 / speed)} /km`
  if (discipline === "swim" && speed && speed > 0) return `${formatMinSec(100 / speed)} /100m`
  if (discipline === "bike") {
    if (activity.average_watts && activity.average_watts > 0) {
      return `${Math.round(activity.average_watts)} W`
    }
    if (speed && speed > 0) return `${(speed * 3.6).toFixed(1)} km/h`
  }
  return null
}

export function activityToCompletion(
  activity: StravaActivity,
  userId: string,
  plannedWorkoutId: number | null
): TablesInsert<"completed_workouts"> {
  const discipline = mapDiscipline(activity)
  const durationMinutes = Math.round(activity.moving_time / 60)
  const distanceKm = Math.round((activity.distance / 1000) * 100) / 100

  return {
    user_id: userId,
    planned_workout_id: plannedWorkoutId,
    source: "strava",
    external_activity_id: String(activity.id),
    // start_date_local is already the athlete's wall-clock time; its date part
    // is the calendar day they'd expect to see it on.
    execution_date: activity.start_date_local.slice(0, 10),
    discipline,
    actual_duration_minutes: durationMinutes > 0 ? durationMinutes : null,
    actual_distance_km: distanceKm > 0 ? distanceKm : null,
    avg_heart_rate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    avg_pace_or_power: formatPaceOrPower(discipline, activity),
    rpe: null,
    notes: activity.name ? `Strava: ${activity.name}`.slice(0, 200) : null,
  }
}
