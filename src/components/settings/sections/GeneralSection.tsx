'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStudioSettings, type StudioSettingsData } from '@/actions/getStudioSettings'
import { updateStudio } from '@/actions/updateStudio'
import type { MembershipRole } from '@/types/db'
import { cn } from '@/lib/utils'

// Common timezones list
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Arizona' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
]

type CountryOption = { code: string; name: string }

const ALL_COUNTRIES: CountryOption[] = [
  { code: 'AF', name: 'Afghanistan' },
  { code: 'AX', name: 'Aland Islands' },
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AQ', name: 'Antarctica' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BV', name: 'Bouvet Island' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IO', name: 'British Indian Ocean Territory' },
  { code: 'BN', name: 'Brunei Darussalam' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CX', name: 'Christmas Island' },
  { code: 'CC', name: 'Cocos (Keeling) Islands' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' },
  { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo, Democratic Republic of the' },
  { code: 'CK', name: 'Cook Islands' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'CW', name: 'Curacao' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'FK', name: 'Falkland Islands (Malvinas)' },
  { code: 'FO', name: 'Faroe Islands' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GF', name: 'French Guiana' },
  { code: 'PF', name: 'French Polynesia' },
  { code: 'TF', name: 'French Southern Territories' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GR', name: 'Greece' },
  { code: 'GL', name: 'Greenland' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GP', name: 'Guadeloupe' },
  { code: 'GU', name: 'Guam' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' },
  { code: 'HM', name: 'Heard Island and McDonald Islands' },
  { code: 'VA', name: 'Holy See' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IM', name: 'Isle of Man' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KP', name: 'North Korea' },
  { code: 'KR', name: 'South Korea' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: "Lao People's Democratic Republic" },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macao' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' },
  { code: 'MQ', name: 'Martinique' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia, Federated States of' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NC', name: 'New Caledonia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NU', name: 'Niue' },
  { code: 'NF', name: 'Norfolk Island' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'MP', name: 'Northern Mariana Islands' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PS', name: 'Palestine, State of' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PN', name: 'Pitcairn' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RE', name: 'Reunion' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'BL', name: 'Saint Barthelemy' },
  { code: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'MF', name: 'Saint Martin (French part)' },
  { code: 'PM', name: 'Saint Pierre and Miquelon' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' },
  { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SX', name: 'Sint Maarten (Dutch part)' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
  { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SJ', name: 'Svalbard and Jan Mayen' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syrian Arab Republic' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UM', name: 'United States Minor Outlying Islands' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Viet Nam' },
  { code: 'VG', name: 'Virgin Islands, British' },
  { code: 'VI', name: 'Virgin Islands, U.S.' },
  { code: 'WF', name: 'Wallis and Futuna' },
  { code: 'EH', name: 'Western Sahara' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
]

const DEFAULT_COUNTRY_CODES = [
  'US',
  'CA',
  'GB',
  'JP',
  'DE',
  'FR',
  'NL',
  'SE',
  'AU',
  'NZ',
  'KR',
  'BR',
  'MX',
  'ES',
  'IT',
]

const COUNTRY_BY_CODE = new Map(ALL_COUNTRIES.map((country) => [country.code, country]))
const COUNTRY_NAME_TO_CODE = new Map(
  ALL_COUNTRIES.map((country) => [country.name.toUpperCase(), country.code])
)
const DEFAULT_COUNTRIES = DEFAULT_COUNTRY_CODES.map((code) => COUNTRY_BY_CODE.get(code)).filter(
  (country): country is CountryOption => Boolean(country)
)

const COUNTRY_DEFAULT_TIMEZONE: Record<string, string> = {
  US: 'America/Chicago',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  UK: 'Europe/London',
  FR: 'Europe/Paris',
  DE: 'Europe/Berlin',
  ES: 'Europe/Madrid',
  IT: 'Europe/Rome',
  NL: 'Europe/Amsterdam',
  SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo',
  FI: 'Europe/Helsinki',
  DK: 'Europe/Copenhagen',
  IE: 'Europe/Dublin',
  AU: 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
  JP: 'Asia/Tokyo',
  CN: 'Asia/Shanghai',
  HK: 'Asia/Hong_Kong',
  SG: 'Asia/Singapore',
  IN: 'Asia/Kolkata',
  AE: 'Asia/Dubai',
  BR: 'America/Sao_Paulo',
  MX: 'America/Mexico_City',
}

const REGION_TIMEZONE_MAP: Record<string, Record<string, string>> = {
  US: {
    CA: 'America/Los_Angeles',
    OR: 'America/Los_Angeles',
    WA: 'America/Los_Angeles',
    NV: 'America/Los_Angeles',
    AZ: 'America/Phoenix',
    CO: 'America/Denver',
    UT: 'America/Denver',
    NM: 'America/Denver',
    ID: 'America/Denver',
    MT: 'America/Denver',
    ND: 'America/Chicago',
    SD: 'America/Chicago',
    NE: 'America/Chicago',
    KS: 'America/Chicago',
    OK: 'America/Chicago',
    TX: 'America/Chicago',
    MN: 'America/Chicago',
    IA: 'America/Chicago',
    MO: 'America/Chicago',
    AR: 'America/Chicago',
    LA: 'America/Chicago',
    WI: 'America/Chicago',
    IL: 'America/Chicago',
    MI: 'America/Detroit',
    IN: 'America/Indiana/Indianapolis',
    KY: 'America/New_York',
    TN: 'America/Chicago',
    MS: 'America/Chicago',
    AL: 'America/Chicago',
    GA: 'America/New_York',
    SC: 'America/New_York',
    NC: 'America/New_York',
    FL: 'America/New_York',
    VA: 'America/New_York',
    WV: 'America/New_York',
    MD: 'America/New_York',
    DE: 'America/New_York',
    NJ: 'America/New_York',
    PA: 'America/New_York',
    NY: 'America/New_York',
    CT: 'America/New_York',
    RI: 'America/New_York',
    MA: 'America/New_York',
    VT: 'America/New_York',
    NH: 'America/New_York',
    ME: 'America/New_York',
    HI: 'Pacific/Honolulu',
    AK: 'America/Anchorage',
  },
  CA: {
    BC: 'America/Vancouver',
    AB: 'America/Edmonton',
    SK: 'America/Regina',
    MB: 'America/Winnipeg',
    ON: 'America/Toronto',
    QC: 'America/Toronto',
    NB: 'America/Moncton',
    NS: 'America/Halifax',
    PE: 'America/Halifax',
    NL: 'America/St_Johns',
  },
  AU: {
    NSW: 'Australia/Sydney',
    VIC: 'Australia/Melbourne',
    QLD: 'Australia/Brisbane',
    SA: 'Australia/Adelaide',
    WA: 'Australia/Perth',
    TAS: 'Australia/Hobart',
    NT: 'Australia/Darwin',
    ACT: 'Australia/Sydney',
  },
}

const CITY_TIMEZONE_HINTS: Array<{ keywords: string[]; timezone: string }> = [
  { keywords: ['new york', 'nyc'], timezone: 'America/New_York' },
  { keywords: ['san francisco', 'sf', 'bay area'], timezone: 'America/Los_Angeles' },
  { keywords: ['los angeles', 'la'], timezone: 'America/Los_Angeles' },
  { keywords: ['seattle'], timezone: 'America/Los_Angeles' },
  { keywords: ['chicago'], timezone: 'America/Chicago' },
  { keywords: ['denver', 'boulder'], timezone: 'America/Denver' },
  { keywords: ['austin', 'dallas', 'houston'], timezone: 'America/Chicago' },
  { keywords: ['toronto'], timezone: 'America/Toronto' },
  { keywords: ['vancouver'], timezone: 'America/Vancouver' },
  { keywords: ['montreal'], timezone: 'America/Toronto' },
  { keywords: ['london'], timezone: 'Europe/London' },
  { keywords: ['paris'], timezone: 'Europe/Paris' },
  { keywords: ['berlin'], timezone: 'Europe/Berlin' },
  { keywords: ['madrid'], timezone: 'Europe/Madrid' },
  { keywords: ['rome'], timezone: 'Europe/Rome' },
  { keywords: ['stockholm'], timezone: 'Europe/Stockholm' },
  { keywords: ['oslo'], timezone: 'Europe/Oslo' },
  { keywords: ['copenhagen'], timezone: 'Europe/Copenhagen' },
  { keywords: ['tokyo'], timezone: 'Asia/Tokyo' },
  { keywords: ['shanghai', 'beijing'], timezone: 'Asia/Shanghai' },
  { keywords: ['singapore'], timezone: 'Asia/Singapore' },
  { keywords: ['dubai'], timezone: 'Asia/Dubai' },
  { keywords: ['mumbai', 'delhi', 'bangalore'], timezone: 'Asia/Kolkata' },
  { keywords: ['sydney'], timezone: 'Australia/Sydney' },
  { keywords: ['melbourne'], timezone: 'Australia/Melbourne' },
  { keywords: ['auckland'], timezone: 'Pacific/Auckland' },
  { keywords: ['mexico city'], timezone: 'America/Mexico_City' },
  { keywords: ['sao paulo'], timezone: 'America/Sao_Paulo' },
]

const REGION_ALIASES: Record<string, string> = {
  CALIFORNIA: 'CA',
  TEXAS: 'TX',
  FLORIDA: 'FL',
  'NEW YORK': 'NY',
  ILLINOIS: 'IL',
  GEORGIA: 'GA',
  COLORADO: 'CO',
  ARIZONA: 'AZ',
  WASHINGTON: 'WA',
  OREGON: 'OR',
  NEVADA: 'NV',
  'BRITISH COLUMBIA': 'BC',
  ONTARIO: 'ON',
  QUEBEC: 'QC',
  ALBERTA: 'AB',
  'NEW SOUTH WALES': 'NSW',
  VICTORIA: 'VIC',
  QUEENSLAND: 'QLD',
  'WESTERN AUSTRALIA': 'WA',
  TASMANIA: 'TAS',
  'SOUTH AUSTRALIA': 'SA',
  'NORTHERN TERRITORY': 'NT',
}

const COUNTRY_ALIASES: Record<string, string> = {
  USA: 'US',
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  'UNITED KINGDOM': 'GB',
  ENGLAND: 'GB',
  SCOTLAND: 'GB',
  'GREAT BRITAIN': 'GB',
  UK: 'GB',
  'SOUTH KOREA': 'KR',
  'KOREA, SOUTH': 'KR',
  'KOREA REPUBLIC OF': 'KR',
  'NORTH KOREA': 'KP',
  'KOREA, NORTH': 'KP',
  RUSSIA: 'RU',
  VIETNAM: 'VN',
  'CZECH REPUBLIC': 'CZ',
  UAE: 'AE',
}

// Lightweight formatter to keep phone input readable while typing
const formatPhoneInput = (value: string) => {
  const raw = value ?? ''
  const hasPlus = raw.trim().startsWith('+')
  const digits = raw.replace(/\D/g, '')

  if (!digits) return hasPlus ? '+' : ''

  const formatLocal = (num: string) => {
    if (num.length <= 3) return num
    if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`
    const main = `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`
    const extra = num.slice(10)
    return extra ? `${main} ${extra}` : main
  }

  const formatInternational = (num: string) => {
    if (num.length <= 3) return num
    if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`
    const main = `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6, 10)}`
    const extra = num.slice(10)
    return extra ? `${main} ${extra}` : main
  }

  if (hasPlus) {
    const countryCodeLength = digits.length <= 11 ? 1 : digits.length <= 12 ? 2 : 3
    const countryCode = digits.slice(0, countryCodeLength)
    const nationalDigits = digits.slice(countryCodeLength)
    const nationalFormatted = nationalDigits ? ` ${formatInternational(nationalDigits)}` : ''
    return `+${countryCode}${nationalFormatted}`
  }

  return formatLocal(digits)
}

const isValidTimezone = (tz: string | undefined | null) => {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const normalizeCountry = (value: string) => {
  if (!value) return ''
  const upper = value.trim().toUpperCase()
  if (COUNTRY_BY_CODE.has(upper)) return upper
  return COUNTRY_ALIASES[upper] ?? COUNTRY_NAME_TO_CODE.get(upper) ?? upper
}

const getCountryLabel = (code: string) => {
  if (!code) return ''
  return COUNTRY_BY_CODE.get(code)?.name ?? code
}

const normalizeRegion = (value: string) => {
  if (!value) return ''
  const upper = value.trim().toUpperCase()
  return REGION_ALIASES[upper] ?? upper
}

const inferTimezoneFromLocation = (city: string, region: string, country: string) => {
  const normalizedCountry = normalizeCountry(country)
  const normalizedRegion = normalizeRegion(region)
  const normalizedCity = city.trim().toLowerCase()

  const regionMap = REGION_TIMEZONE_MAP[normalizedCountry]
  if (regionMap && normalizedRegion && regionMap[normalizedRegion]) {
    const candidate = regionMap[normalizedRegion]
    if (isValidTimezone(candidate)) return candidate
  }

  for (const hint of CITY_TIMEZONE_HINTS) {
    if (hint.keywords.some((keyword) => normalizedCity.includes(keyword))) {
      if (isValidTimezone(hint.timezone)) return hint.timezone
    }
  }

  const countryDefault = COUNTRY_DEFAULT_TIMEZONE[normalizedCountry]
  if (countryDefault && isValidTimezone(countryDefault)) {
    return countryDefault
  }

  return undefined
}

interface GeneralSectionProps {
  userRole: MembershipRole | null
  initialData?: StudioSettingsData | null
  view?: 'all' | 'general' | 'scheduling'
  className?: string
}

export default function GeneralSection({
  userRole,
  initialData,
  view = 'all',
  className,
}: GeneralSectionProps) {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<StudioSettingsData | null>(null)
  const containerClassName = className ?? 'pl-10 pr-10 pt-6 pb-6 space-y-6'

  // Form state
  const [contactEmail, setContactEmail] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [timezone, setTimezone] = React.useState('UTC')
  const [city, setCity] = React.useState('')
  const [country, setCountry] = React.useState('')
  const [countryPopoverOpen, setCountryPopoverOpen] = React.useState(false)
  const [countryQuery, setCountryQuery] = React.useState('')
  // Saving states
  const [savingContact, setSavingContact] = React.useState(false)
  const [savingLocation, setSavingLocation] = React.useState(false)
  const [timezoneManuallySet, setTimezoneManuallySet] = React.useState(false)

  // Track original values to detect changes
  const originalValues = React.useRef({
    contact_email: '',
    contact_phone: '',
    timezone: 'UTC',
    city: '',
    country: '',
  })

  // Timezone preview
  const [timezonePreview, setTimezonePreview] = React.useState('')

  const showInformation = view === 'all' || view === 'general'
  const showTimezone = showInformation

  const matchingCountries = React.useMemo(() => {
    const query = countryQuery.trim().toLowerCase()
    if (!query) return []
    return ALL_COUNTRIES.filter((countryOption) => {
      const name = countryOption.name.toLowerCase()
      const code = countryOption.code.toLowerCase()
      return name.includes(query) || code.includes(query)
    })
  }, [countryQuery])

  // Load initial data
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Use provided initial data if available (avoids double fetch on page load)
      if (initialData) {
        const normalizedCountry = normalizeCountry(initialData.studio.country || '')
        setData(initialData)
        setContactEmail(initialData.studio.contact_email || '')
        setContactPhone(formatPhoneInput(initialData.studio.contact_phone || ''))
        setTimezone(initialData.studio.timezone || 'UTC')
        setCity(initialData.studio.city || '')
        setCountry(normalizedCountry)
        setTimezoneManuallySet(false)
        originalValues.current = {
          contact_email: initialData.studio.contact_email || '',
          contact_phone: formatPhoneInput(initialData.studio.contact_phone || ''),
          timezone: initialData.studio.timezone || 'UTC',
          city: initialData.studio.city || '',
          country: normalizedCountry,
        }
        setLoading(false)
        return
      }

      const result = await getStudioSettings()
      if ('error' in result) {
        toast.error(result.message)
        setLoading(false)
        return
      }
      setData(result)
      const normalizedCountry = normalizeCountry(result.studio.country || '')
      setContactEmail(result.studio.contact_email || '')
      setContactPhone(formatPhoneInput(result.studio.contact_phone || ''))
      setTimezone(result.studio.timezone || 'UTC')
      setCity(result.studio.city || '')
      setCountry(normalizedCountry)
      setTimezoneManuallySet(false)
      originalValues.current = {
        contact_email: result.studio.contact_email || '',
        contact_phone: formatPhoneInput(result.studio.contact_phone || ''),
        timezone: result.studio.timezone || 'UTC',
        city: result.studio.city || '',
        country: normalizedCountry,
      }
      setLoading(false)
    }
    fetchData()
  }, [initialData])

  // Update timezone preview
  React.useEffect(() => {
    if (!showTimezone) {
      setTimezonePreview('')
      return
    }
    if (timezone) {
      try {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        setTimezonePreview(formatter.format(now))
      } catch (error) {
        setTimezonePreview('Invalid timezone')
      }
    }
  }, [showTimezone, timezone])

  // Update preview every second
  React.useEffect(() => {
    if (!showTimezone) return
    const interval = setInterval(() => {
      if (timezone) {
        try {
          const now = new Date()
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
          setTimezonePreview(formatter.format(now))
        } catch (error) {
          setTimezonePreview('Invalid timezone')
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showTimezone, timezone])

  React.useEffect(() => {
    setTimezoneManuallySet(false)
  }, [city, country])

  React.useEffect(() => {
    if (!city && !country) return
    if (timezoneManuallySet) return
    const inferred = inferTimezoneFromLocation(city, '', country)
    if (inferred && inferred !== timezone) {
      setTimezone(inferred)
    }
  }, [city, country, timezone, timezoneManuallySet])

  const hasContactChanges =
    showInformation &&
    (contactEmail.trim() !== originalValues.current.contact_email ||
      contactPhone.trim() !== originalValues.current.contact_phone)

  const hasLocationChanges =
    showInformation &&
    (city.trim() !== originalValues.current.city ||
      country.trim() !== originalValues.current.country ||
      (showTimezone && timezone !== originalValues.current.timezone))

  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
    setTimezoneManuallySet(true)
  }

  const handleSaveContact = async () => {
    if (!hasContactChanges) return

    const trimmedEmail = contactEmail.trim()
    const trimmedPhone = contactPhone.trim()

    if (trimmedEmail) {
      if (trimmedEmail.length > 254) {
        toast.error('Email cannot exceed 254 characters')
        return
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        toast.error('Please enter a valid email')
        return
      }
    }

    if (trimmedPhone) {
      if (trimmedPhone.length > 32) {
        toast.error('Phone cannot exceed 32 characters')
        return
      }
      if (!/^[\d+\-\s().]+$/.test(trimmedPhone)) {
        toast.error('Phone contains invalid characters')
        return
      }
      const digitCount = (trimmedPhone.match(/\d/g) || []).length
      if (digitCount < 7) {
        toast.error('Phone must include at least 7 digits')
        return
      }
    }

    setSavingContact(true)
    try {
      const result = await updateStudio({
        contact_email: trimmedEmail || null,
        contact_phone: trimmedPhone || null,
      })

      if ('error' in result) {
        toast.error(result.message)
        setSavingContact(false)
        return
      }

      originalValues.current.contact_email = trimmedEmail
      originalValues.current.contact_phone = trimmedPhone

      if (data) {
        setData({
          ...data,
          studio: {
            ...data.studio,
            contact_email: trimmedEmail || null,
            contact_phone: trimmedPhone || null,
          },
        })
      }

      toast.success('Contact info saved')
    } catch (error) {
      toast.error('Failed to save contact info')
    } finally {
      setSavingContact(false)
    }
  }

  const handleCancelContact = () => {
    setContactEmail(originalValues.current.contact_email)
    setContactPhone(originalValues.current.contact_phone)
  }

  // Handle save location section
  const handleSaveLocation = async () => {
    if (!hasLocationChanges) return

    const trimmedCity = city.trim()
    const trimmedCountry = normalizeCountry(country.trim())

    const exceeds = (value: string, max: number) => value.length > max
    if (exceeds(trimmedCity, 96)) {
      toast.error('Location fields exceed allowed length')
      return
    }

    if (trimmedCountry && !COUNTRY_BY_CODE.has(trimmedCountry)) {
      toast.error('Please select a valid country')
      return
    }

    const anyLocation = trimmedCity || trimmedCountry
    if (anyLocation && (!trimmedCity || !trimmedCountry)) {
      toast.error('City and country are required for location')
      return
    }

    setSavingLocation(true)
    try {
      const result = await updateStudio({
        city: trimmedCity || null,
        country: trimmedCountry || null,
        timezone,
      })

      if ('error' in result) {
        toast.error(result.message)
        setSavingLocation(false)
        return
      }

      originalValues.current.city = trimmedCity
      originalValues.current.country = trimmedCountry
      originalValues.current.timezone = timezone

      if (data) {
        setData({
          ...data,
          studio: {
            ...data.studio,
            city: trimmedCity || null,
            country: trimmedCountry || null,
            timezone,
          },
        })
      }

      toast.success('Location saved successfully')
    } catch (error) {
      toast.error('Failed to save location')
    } finally {
      setSavingLocation(false)
    }
  }

  // Handle cancel location section
  const handleCancelLocation = () => {
    setCity(originalValues.current.city)
    setCountry(originalValues.current.country)
    setTimezone(originalValues.current.timezone)
    setTimezoneManuallySet(false)
  }


  const isOwnerOrAdmin = data?.isOwnerOrAdmin ?? false

  if (loading) {
    return (
      <div className={cn(containerClassName)}>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-4 px-6 border-b last:border-b-0">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-64 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex-1 max-w-md">
                  <div className="h-10 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={cn(containerClassName)}>
        <p className="text-sm text-muted-foreground">Failed to load studio settings</p>
      </div>
    )
  }

  return (
    <div className={cn(containerClassName)}>
      {!isOwnerOrAdmin && (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You can view studio info. Admins can update branding and timezone.
        </div>
      )}
      {showInformation && (
        <Card className="shadow-none">
          <CardContent className="p-0">
            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-4 py-2.5 border-b">
              <div>
                <label htmlFor="studio-email" className="text-sm font-medium">
                  Email
                  <span className="block text-xs text-muted-foreground">Used for studio contact.</span>
                </label>
              </div>
              <div className="max-w-md">
                <Input
                  id="studio-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="studio@email.com"
                  maxLength={254}
                  disabled={savingContact || !isOwnerOrAdmin}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-4 py-2.5 border-b">
              <div>
                <label htmlFor="studio-phone" className="text-sm font-medium">
                  Phone
                  <span className="block text-xs text-muted-foreground">Used for studio contact.</span>
                </label>
              </div>
              <div className="max-w-md">
                <Input
                  id="studio-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(formatPhoneInput(e.target.value))}
                  placeholder="+1 (555) 123-4567"
                  maxLength={32}
                  disabled={savingContact || !isOwnerOrAdmin}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 p-4 pt-3">
                <Button
                  variant="outline"
                  onClick={handleCancelContact}
                  disabled={!hasContactChanges || savingContact}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveContact} disabled={!hasContactChanges || savingContact}>
                  {savingContact ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showInformation && (
        <Card className="shadow-none">
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base font-semibold">Studio Location</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-4 py-2.5 border-b">
              <div>
                <label htmlFor="studio-country" className="text-sm font-medium">
                  Country
                  <span className="block text-xs text-muted-foreground">Used for timezone defaults.</span>
                </label>
              </div>
              <div className="max-w-md">
                <Popover
                  open={countryPopoverOpen}
                  onOpenChange={(open) => {
                    if (savingLocation || !isOwnerOrAdmin) return
                    setCountryPopoverOpen(open)
                    if (!open) {
                      setCountryQuery('')
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      id="studio-country"
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryPopoverOpen}
                      className={cn(
                        'w-full justify-between font-normal',
                        !country ? 'text-muted-foreground' : '',
                        !isOwnerOrAdmin ? 'bg-muted' : ''
                      )}
                      disabled={savingLocation || !isOwnerOrAdmin}
                    >
                      <span>{country ? getCountryLabel(country) : 'Select country'}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search country..."
                        value={countryQuery}
                        onValueChange={setCountryQuery}
                      />
                      <CommandList>
                        {countryQuery ? (
                          <CommandGroup heading="Results">
                            {matchingCountries.map((countryOption) => (
                              <CommandItem
                                key={countryOption.code}
                                value={`${countryOption.name} ${countryOption.code}`}
                                onSelect={() => {
                                  setCountry(countryOption.code)
                                  setCountryPopoverOpen(false)
                                  setCountryQuery('')
                                }}
                              >
                                <Check
                                  className={cn(
                                    'h-4 w-4',
                                    country === countryOption.code ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span>{countryOption.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {countryOption.code}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ) : (
                          <CommandGroup heading="Common">
                            {DEFAULT_COUNTRIES.map((countryOption) => (
                              <CommandItem
                                key={countryOption.code}
                                value={`${countryOption.name} ${countryOption.code}`}
                                onSelect={() => {
                                  setCountry(countryOption.code)
                                  setCountryPopoverOpen(false)
                                  setCountryQuery('')
                                }}
                              >
                                <Check
                                  className={cn(
                                    'h-4 w-4',
                                    country === countryOption.code ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span>{countryOption.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {countryOption.code}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        <CommandEmpty>No country found.</CommandEmpty>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-4 py-2.5 border-b">
              <div>
                <label htmlFor="studio-city" className="text-sm font-medium">
                  City
                  <span className="block text-xs text-muted-foreground">
                    Used for scheduling and timezone.
                  </span>
                </label>
              </div>
              <div className="max-w-md">
                <Input
                  id="studio-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                  maxLength={96}
                  disabled={savingLocation || !isOwnerOrAdmin}
                  className={!isOwnerOrAdmin ? 'bg-muted' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] items-center gap-4 px-4 py-2.5 border-b">
              <div>
                <label htmlFor="timezone" className="text-sm font-medium">
                  Timezone
                  <span className="block text-xs text-muted-foreground">
                    Derived from address; override if needed.
                  </span>
                </label>
              </div>
              <div className="max-w-md">
                <Select
                  value={timezone}
                  onValueChange={handleTimezoneChange}
                  disabled={savingLocation || !isOwnerOrAdmin}
                >
                  <SelectTrigger id="timezone" className={!isOwnerOrAdmin ? 'bg-muted' : ''}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {timezonePreview && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current time: <span className="font-mono">{timezonePreview}</span>
                  </p>
                )}
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex justify-end gap-2 p-4 pt-3">
                <Button
                  variant="outline"
                  onClick={handleCancelLocation}
                  disabled={!hasLocationChanges || savingLocation}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveLocation} disabled={!hasLocationChanges || savingLocation}>
                  {savingLocation ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  )
}
