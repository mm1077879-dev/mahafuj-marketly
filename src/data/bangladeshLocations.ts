import {
  getAllDivision,
  getAllDistrict,
  getAllUpazila,
  getAllUnion,
  getDistricts,
  getUpazilas,
  getUnions,
} from 'bd-divisions-to-unions';
import type { BangladeshAddress } from '../types';

const divisionEntries = getAllDivision('en');
const districtEntriesByDivision = getAllDistrict('en');
const upazilaEntriesByDistrict = getAllUpazila('en');
const unionEntriesByUpazila = getAllUnion('en');

const divisionValueMap = new Map(divisionEntries.map((item) => [item.title, item.value]));
const divisionTitleMap = new Map(divisionEntries.map((item) => [String(item.value), item.title]));

const districtValueMap = new Map<string, string | number>();
const upazilaValueMap = new Map<string, string | number>();

export const BANGLADESH_DIVISIONS = divisionEntries.map((item) => item.title);

const normalizeDivisionTitle = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) return BANGLADESH_DIVISIONS[0] || 'Dhaka';

  const normalized = trimmed.replace(/[’']/g, '').replace(/\s+/g, ' ');
  const directMatch = BANGLADESH_DIVISIONS.find(
    (division) => division.toLowerCase() === trimmed.toLowerCase() || division.toLowerCase() === normalized.toLowerCase()
  );
  if (directMatch) return directMatch;

  const legacyMap: Record<string, string> = {
    Chittagong: 'Chattogram',
    Chattagram: 'Chattogram',
    'Coxs Bazar': 'Coxsbazar',
    "Cox's Bazar": 'Coxsbazar',
    "Cox’s Bazar": 'Coxsbazar',
    Barishal: 'Barisal',
  };

  return legacyMap[trimmed] || legacyMap[normalized] || normalized;
};

const normalizeDistrictTitle = (value: string): string => {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  const normalized = trimmed.replace(/[’']/g, '').replace(/\s+/g, ' ');
  const legacyMap: Record<string, string> = {
    Chittagong: 'Chattogram',
    Chattagram: 'Chattogram',
    'Coxs Bazar': 'Coxsbazar',
    "Cox's Bazar": 'Coxsbazar',
    "Cox’s Bazar": 'Coxsbazar',
  };

  return legacyMap[trimmed] || legacyMap[normalized] || normalized;
};

Object.entries(districtEntriesByDivision).forEach(([divisionValue, districts]) => {
  const divisionTitle = divisionTitleMap.get(String(divisionValue)) ?? '';
  (districts ?? []).forEach((district) => {
    const normalizedDivisionTitle = normalizeDivisionTitle(divisionTitle);
    const normalizedDistrictTitle = normalizeDistrictTitle(district.title);
    districtValueMap.set(`${normalizedDivisionTitle}|${normalizedDistrictTitle}`, district.value);
    districtValueMap.set(`${normalizedDivisionTitle}|${district.title}`, district.value);
    districtValueMap.set(`${divisionTitle}|${district.title}`, district.value);
  });
});

Object.entries(upazilaEntriesByDistrict).forEach(([districtValue, upazilas]) => {
  const districtTitle = Object.values(districtEntriesByDivision)
    .flat()
    .find((district) => String(district.value) === String(districtValue))?.title ?? '';

  (upazilas ?? []).forEach((upazila) => {
    const normalizedDistrictTitle = normalizeDistrictTitle(districtTitle);
    upazilaValueMap.set(`${normalizedDistrictTitle}|${upazila.title}`, upazila.value);
    upazilaValueMap.set(`${districtTitle}|${upazila.title}`, upazila.value);
  });
});

export const getDistrictOptionsForDivision = (divisionTitle: string): string[] => {
  const safeDivision = normalizeDivisionTitle(divisionTitle);
  const divisionValue = divisionValueMap.get(safeDivision) ?? divisionValueMap.get(divisionTitle);
  if (divisionValue === undefined) return [];

  return (getDistricts(divisionValue, 'en') ?? []).map((district) => district.title);
};

export const getUpazilaOptionsForDistrict = (divisionTitle: string, districtTitle: string): string[] => {
  const safeDivision = normalizeDivisionTitle(divisionTitle);
  const normalizedDistrict = normalizeDistrictTitle(districtTitle);
  const districtValue =
    districtValueMap.get(`${safeDivision}|${normalizedDistrict}`) ??
    districtValueMap.get(`${safeDivision}|${districtTitle}`) ??
    districtValueMap.get(`${divisionTitle}|${districtTitle}`);
  if (districtValue === undefined) return [];

  return (getUpazilas(districtValue, 'en') ?? []).map((upazila) => upazila.title);
};

export const getUnionOptionsForUpazila = (divisionTitle: string, districtTitle: string, upazilaTitle: string): string[] => {
  const safeDivision = normalizeDivisionTitle(divisionTitle);
  const normalizedDistrict = normalizeDistrictTitle(districtTitle);
  const upazilaValue =
    upazilaValueMap.get(`${normalizedDistrict}|${upazilaTitle}`) ??
    upazilaValueMap.get(`${districtTitle}|${upazilaTitle}`) ??
    upazilaValueMap.get(`${safeDivision}|${upazilaTitle}`) ??
    upazilaValueMap.get(`${divisionTitle}|${upazilaTitle}`);
  if (upazilaValue === undefined) return [];

  return (getUnions(upazilaValue, 'en') ?? []).map((union) => union.title);
};

export const getValidatedAddressDefaults = (
  overrides: Partial<BangladeshAddress> = {}
): BangladeshAddress => {
  const division = normalizeDivisionTitle(overrides.division || 'Dhaka');
  const divisionOptions = getDistrictOptionsForDivision(division);
  const normalizedDistrictQuery = normalizeDistrictTitle(overrides.district || divisionOptions[0] || 'Dhaka');
  const district = divisionOptions.some((item) => normalizeDistrictTitle(item).toLowerCase() === normalizedDistrictQuery.toLowerCase())
    ? (divisionOptions.find((item) => normalizeDistrictTitle(item).toLowerCase() === normalizedDistrictQuery.toLowerCase()) ?? divisionOptions[0] ?? '')
    : (divisionOptions[0] ?? '');
  const upazilaOptions = getUpazilaOptionsForDistrict(division, district);
  const normalizedUpazilaQuery = overrides.upazila || upazilaOptions[0] || '';
  const upazila = upazilaOptions.some((item) => item.toLowerCase() === normalizedUpazilaQuery.toLowerCase())
    ? normalizedUpazilaQuery
    : upazilaOptions[0] || '';
  const unionOptions = getUnionOptionsForUpazila(division, district, upazila);
  const normalizedUnionQuery = overrides.union || unionOptions[0] || '';
  const union = unionOptions.some((item) => item.toLowerCase() === normalizedUnionQuery.toLowerCase())
    ? normalizedUnionQuery
    : unionOptions[0] || '';

  return {
    fullName: overrides.fullName || '',
    phone: overrides.phone || '+880 1',
    email: overrides.email || '',
    division,
    district,
    upazila,
    union,
    streetAddress: overrides.streetAddress || '',
    postalCode: overrides.postalCode || '1212',
  };
};

export const BangladeshGeo = {
  divisions: BANGLADESH_DIVISIONS,
  districtMap: districtEntriesByDivision,
  upazilaMap: upazilaEntriesByDistrict,
  unionMap: unionEntriesByUpazila,
};
