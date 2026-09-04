export interface UniversityLookup {
  name: string;
  lat: number;
  lng: number;
}

// Approximate campus coordinates for South African public universities —
// a client-side stand-in for a real places/geocoding search, avoiding the
// separate Places API billing surface. Good enough to jump the map close;
// final precision still comes from clicking to place the actual marker.
export const SA_UNIVERSITIES: UniversityLookup[] = [
  // University of Cape Town
  { name: 'University of Cape Town - Upper Campus (Rondebosch)', lat: -33.9577, lng: 18.4612 },
  { name: 'University of Cape Town - Hiddingh Campus', lat: -33.9267, lng: 18.4142 },
  { name: 'University of Cape Town - Health Sciences Campus (Observatory)', lat: -33.9396, lng: 18.4622 },

  // University of the Witwatersrand
  { name: 'University of the Witwatersrand - Braamfontein Campus', lat: -26.1929, lng: 28.0305 },
  { name: 'University of the Witwatersrand - Education Campus (Parktown)', lat: -26.1789, lng: 28.0454 },
  { name: 'University of the Witwatersrand - Health Sciences Campus (Parktown)', lat: -26.1799, lng: 28.0424 },

  // University of the Free State
  { name: 'University of the Free State - Bloemfontein Campus', lat: -29.1082, lng: 26.1887 },
  { name: 'University of the Free State - South Campus', lat: -29.1215, lng: 26.2140 },
  { name: 'University of the Free State - Qwaqwa Campus', lat: -28.5083, lng: 28.8236 },

  // University of Johannesburg
  { name: 'University of Johannesburg - Auckland Park Kingsway Campus', lat: -26.1825, lng: 27.9714 },
  { name: 'University of Johannesburg - Doornfontein Campus', lat: -26.1959, lng: 28.0507 },
  { name: 'University of Johannesburg - Soweto Campus', lat: -26.2485, lng: 27.8540 },

  // University of Pretoria
  { name: 'University of Pretoria - Hatfield Campus', lat: -25.7545, lng: 28.2314 },
  { name: 'University of Pretoria - Groenkloof Campus', lat: -25.7659, lng: 28.2205 },
  { name: 'University of Pretoria - Prinshof Campus (Gezina)', lat: -25.7304, lng: 28.1932 },

  // University of KwaZulu-Natal
  { name: 'University of KwaZulu-Natal - Howard College Campus', lat: -29.8677, lng: 30.9757 },
  { name: 'University of KwaZulu-Natal - Westville Campus', lat: -29.8237, lng: 30.9460 },
  { name: 'University of KwaZulu-Natal - Pietermaritzburg Campus', lat: -29.6167, lng: 30.4000 },

  // North-West University
  { name: 'North-West University - Potchefstroom Campus', lat: -26.6905, lng: 27.0941 },
  { name: 'North-West University - Mahikeng Campus', lat: -25.8494, lng: 25.6072 },
  { name: 'North-West University - Vanderbijlpark Campus', lat: -26.7080, lng: 27.8378 },

  // Walter Sisulu University
  { name: 'Walter Sisulu University - Mthatha Campus', lat: -31.5889, lng: 28.7844 },
  { name: 'Walter Sisulu University - Buffalo City Campus', lat: -33.0153, lng: 27.9116 },
  { name: 'Walter Sisulu University - Butterworth Campus', lat: -32.3308, lng: 28.1462 },

  // Cape Peninsula University of Technology
  { name: 'Cape Peninsula University of Technology - Bellville Campus', lat: -33.9321, lng: 18.6431 },
  { name: 'Cape Peninsula University of Technology - Cape Town Campus', lat: -33.9280, lng: 18.4172 },
  { name: 'Cape Peninsula University of Technology - Wellington Campus', lat: -33.6394, lng: 19.0111 },

  // Single-campus / single-entry entries
  { name: 'Stellenbosch University', lat: -33.9321, lng: 18.8602 },
  { name: 'Rhodes University', lat: -33.3100, lng: 26.5216 },
  { name: 'University of the Western Cape', lat: -33.9346, lng: 18.6291 },
  { name: 'Nelson Mandela University', lat: -33.9878, lng: 25.6470 },
  { name: 'University of Fort Hare', lat: -32.7847, lng: 26.8420 },
  { name: 'University of South Africa', lat: -25.7487, lng: 28.1667 },
  { name: 'University of Venda', lat: -22.9776, lng: 30.4467 },
  { name: 'University of Limpopo', lat: -23.8809, lng: 29.7382 },
  { name: 'Central University of Technology', lat: -29.1039, lng: 26.1929 },
  { name: 'Durban University of Technology', lat: -29.8548, lng: 31.0004 },
  { name: 'Mangosuthu University of Technology', lat: -29.9701, lng: 30.9101 },
  { name: 'Sol Plaatje University', lat: -28.7282, lng: 24.7499 },
  { name: 'University of Mpumalanga', lat: -25.4351, lng: 30.9814 },
  { name: 'Sefako Makgatho Health Sciences University', lat: -25.6197, lng: 28.0122 },
  { name: 'Vaal University of Technology', lat: -26.7145, lng: 27.8489 }
];