"use client"

import type { Control, FieldValues, Path } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DISCIPLINES, DISCIPLINE_LABELS, FITNESS_LEVELS } from "@/lib/types/domain"

type ProfileFieldsProps<T extends FieldValues> = {
  control: Control<T>
}

const FITNESS_LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
}

export function ProfileFields<T extends FieldValues>({ control }: ProfileFieldsProps<T>) {
  return (
    <>
      <FormField
        control={control}
        name={"fitnessLevel" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Fitness level</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your fitness level" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FITNESS_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {FITNESS_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"primaryDiscipline" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Primary discipline</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your primary discipline" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {DISCIPLINES.map((discipline) => (
                  <SelectItem key={discipline} value={discipline}>
                    {DISCIPLINE_LABELS[discipline]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"targetRaceDate" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Target race date (optional)</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"targetRaceDistance" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Target race distance (optional)</FormLabel>
            <FormControl>
              <Input placeholder="e.g. 70.3, Ironman, Olympic" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
