export const ICAO_TO_IATA: Record<string, string> = {
  // North America
  AAL: "AA",
  DAL: "DL",
  UAL: "UA",
  SWA: "WN",
  JBU: "B6",
  ASA: "AS",
  NKS: "NK",
  FFT: "F9",
  HAL: "HA",
  SKW: "OO",
  ENY: "MQ",
  RPA: "YX",
  ACA: "AC",
  WJA: "WS",
  JZA: "QK",
  AMX: "AM",
  VOI: "Y4",
  VIV: "VB",
  // Europe
  BAW: "BA",
  DLH: "LH",
  AFR: "AF",
  KLM: "KL",
  RYR: "FR",
  EZY: "U2",
  EJU: "U2",
  VLG: "VY",
  IBE: "IB",
  AUA: "OS",
  SWR: "LX",
  SAS: "SK",
  FIN: "AY",
  TAP: "TP",
  ITY: "AZ",
  AZA: "AZ",
  LOT: "LO",
  WZZ: "W6",
  TRA: "HV",
  TOM: "BY",
  EXS: "LS",
  EWG: "EW",
  CFG: "DE",
  AEE: "A3",
  // Middle East / Africa
  UAE: "EK",
  QTR: "QR",
  ETD: "EY",
  SVA: "SV",
  THY: "TK",
  ELY: "LY",
  ETH: "ET",
  SAA: "SA",
  KQA: "KQ",
  RAM: "AT",
  MSR: "MS",
  // Asia
  ANA: "NH",
  JAL: "JL",
  CPA: "CX",
  SIA: "SQ",
  MAS: "MH",
  THA: "TG",
  EVA: "BR",
  CAL: "CI",
  KAL: "KE",
  AAR: "OZ",
  CES: "MU",
  CCA: "CA",
  CSN: "CZ",
  AIQ: "FD",
  AXM: "AK",
  JSA: "3K",
  GIA: "GA",
  PAL: "PR",
  AIC: "AI",
  IGO: "6E",
  SEJ: "SG",
  VTI: "UK",
  SLK: "SL",
  // Oceania / South America
  QFA: "QF",
  VOZ: "VA",
  JST: "JQ",
  ANZ: "NZ",
  TAM: "JJ",
  GLO: "G3",
  AZU: "AD",
  LAN: "LA",
  ARG: "AR",
  CMP: "CM",
  AVA: "AV",
};

const CALLSIGN_PREFIX_RE = /^([A-Z]{3})\d/;

// Extracts the 3 letter ICAO airline code from a callsign, or null
export function parseAirlineCode(
  callsign: string | null | undefined,
): string | null {
  if (!callsign) return null;
  const m = callsign.trim().toUpperCase().match(CALLSIGN_PREFIX_RE);
  return m ? m[1] : null;
}

// Full IATA lookup
export function getAirlineIata(
  callsign: string | null | undefined,
): string | null {
  const icao = parseAirlineCode(callsign);
  return icao ? (ICAO_TO_IATA[icao] ?? null) : null;
}

// Kiwi.com CDN URL for the airline logo
export function getAirlineLogoUrl(
  callsign: string | null | undefined,
): string | null {
  const iata = getAirlineIata(callsign);
  return iata ? `https://images.kiwi.com/airlines/64/${iata}.png` : null;
}
