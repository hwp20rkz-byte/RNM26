import { z } from "zod";

export const buildingProfileSchema = z.object({
  name: z.string().min(1, "Укажите название ЖК"),
  address: z.string().min(1, "Укажите адрес"),
  region: z.string().min(1, "Выберите регион"),
  livingArea: z.number().positive("Площадь должна быть больше 0"),
  commercialArea: z.number().min(0),
  storageArea: z.number().min(0),
  apartments: z.number().int().positive("Должна быть хотя бы 1 квартира"),
  entrances: z.number().int().positive("Должен быть хотя бы 1 подъезд"),
  elevators: z.number().int().min(0),
  parkingSpots: z.number().int().min(0),
  parkingArea: z.number().min(0),
  yardPavedArea: z.number().min(0),
  yardGreenArea: z.number().min(0),
  annualCommercialIncome: z.number().min(0),
  capitalRepairMrpMultiplier: z.number().min(0.005, "Не менее 0,005 МРП по Закону РК"),
  commercialRateCoefficient: z.number().positive(),
});

export type BuildingProfileInput = z.infer<typeof buildingProfileSchema>;
