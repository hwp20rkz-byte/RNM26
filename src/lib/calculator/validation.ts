import { z } from "zod";

export const buildingProfileSchema = z
  .object({
    name: z.string().min(1, "Укажите название объекта"),
    address: z.string(),
    region: z.string().min(1, "Выберите регион"),
    objectType: z.enum(["residential", "mixed", "commercial"]),
    livingArea: z.number().min(0),
    commercialArea: z.number().min(0),
    storageArea: z.number().min(0),
    apartments: z.number().int().min(0),
    entrances: z.number().int().positive("Должен быть хотя бы 1 подъезд/вход"),
    elevators: z.number().int().min(0),
    parkingSpots: z.number().int().min(0),
    parkingArea: z.number().min(0),
    yardPavedArea: z.number().min(0),
    yardGreenArea: z.number().min(0),
    annualCommercialIncome: z.number().min(0),
    capitalRepairMrpMultiplier: z.number().min(0.005, "Не менее 0,005 МРП по Закону РК"),
    commercialRateCoefficient: z.number().positive(),
  })
  .refine((v) => v.livingArea + v.commercialArea > 0, {
    message: "Площадь (жилая + коммерческая) должна быть больше 0",
    path: ["livingArea"],
  });

export type BuildingProfileInput = z.infer<typeof buildingProfileSchema>;
