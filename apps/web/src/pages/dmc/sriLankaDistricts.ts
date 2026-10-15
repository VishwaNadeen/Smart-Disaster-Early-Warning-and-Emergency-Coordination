export interface SriLankaDistrictInfo {
  name: string
  province: string
  lat: number
  lng: number
  popularCities: string[]
}

export const SRI_LANKA_DISTRICTS: Record<string, SriLankaDistrictInfo> = {
  Ampara: {
    name: 'Ampara',
    province: 'Eastern',
    lat: 7.2912,
    lng: 81.6724,
    popularCities: ['Ampara', 'Kalmunai', 'Sammanthurai', 'Akkaraipattu', 'Pottuvil'],
  },
  Anuradhapura: {
    name: 'Anuradhapura',
    province: 'North Central',
    lat: 8.3114,
    lng: 80.4037,
    popularCities: ['Anuradhapura', 'Kekirawa', 'Medawachchiya', 'Tambuttegama', 'Eppawala'],
  },
  Badulla: {
    name: 'Badulla',
    province: 'Uva',
    lat: 6.9934,
    lng: 81.055,
    popularCities: ['Badulla', 'Bandarawela', 'Haputale', 'Ella', 'Mahiyanganaya', 'Welimada'],
  },
  Batticaloa: {
    name: 'Batticaloa',
    province: 'Eastern',
    lat: 7.731,
    lng: 81.6747,
    popularCities: ['Batticaloa', 'Kattankudy', 'Eravur', 'Valaichchenai', 'Chenkalady'],
  },
  Colombo: {
    name: 'Colombo',
    province: 'Western',
    lat: 6.9271,
    lng: 79.8612,
    popularCities: ['Colombo', 'Dehiwala', 'Moratuwa', 'Kaduwela', 'Kolonnawa', 'Homagama', 'Kesbewa', 'Maharagama'],
  },
  Galle: {
    name: 'Galle',
    province: 'Southern',
    lat: 6.0535,
    lng: 80.221,
    popularCities: ['Galle', 'Hikkaduwa', 'Ambalangoda', 'Elpitiya', 'Baddegama', 'Karapitiya'],
  },
  Gampaha: {
    name: 'Gampaha',
    province: 'Western',
    lat: 7.084,
    lng: 80.0098,
    popularCities: ['Gampaha', 'Negombo', 'Kelaniya', 'Ja-Ela', 'Wattala', 'Kadawatha', 'Minuwangoda', 'Biyagama'],
  },
  Hambantota: {
    name: 'Hambantota',
    province: 'Southern',
    lat: 6.1429,
    lng: 81.1212,
    popularCities: ['Hambantota', 'Tangalle', 'Beliatta', 'Tissamaharama', 'Ambalantota'],
  },
  Jaffna: {
    name: 'Jaffna',
    province: 'Northern',
    lat: 9.6615,
    lng: 80.0255,
    popularCities: ['Jaffna', 'Chavakachcheri', 'Point Pedro', 'Nallur', 'Valvettithurai'],
  },
  Kalutara: {
    name: 'Kalutara',
    province: 'Western',
    lat: 6.5854,
    lng: 79.9607,
    popularCities: ['Kalutara', 'Panadura', 'Horana', 'Beruwala', 'Matugama', 'Aluthgama', 'Bandaragama'],
  },
  Kandy: {
    name: 'Kandy',
    province: 'Central',
    lat: 7.2906,
    lng: 80.6337,
    popularCities: ['Kandy', 'Peradeniya', 'Gampola', 'Katugastota', 'Kundasale', 'Nawalapitiya', 'Akurana'],
  },
  Kegalle: {
    name: 'Kegalle',
    province: 'Sabaragamuwa',
    lat: 7.2513,
    lng: 80.3464,
    popularCities: ['Kegalle', 'Mawanella', 'Warakapola', 'Rambukkana', 'Yatiyantota', 'Deraniyagala'],
  },
  Kilinochchi: {
    name: 'Kilinochchi',
    province: 'Northern',
    lat: 9.3803,
    lng: 80.377,
    popularCities: ['Kilinochchi', 'Paranthan', 'Pallai', 'Poonakary'],
  },
  Kurunegala: {
    name: 'Kurunegala',
    province: 'North Western',
    lat: 7.4863,
    lng: 80.3623,
    popularCities: ['Kurunegala', 'Kuliyapitiya', 'Pannala', 'Narammala', 'Polgahawela', 'Wariyapola', 'Ibbagamuwa'],
  },
  Mannar: {
    name: 'Mannar',
    province: 'Northern',
    lat: 8.981,
    lng: 79.9044,
    popularCities: ['Mannar', 'Nanaddan', 'Madhu', 'Pesalai'],
  },
  Matale: {
    name: 'Matale',
    province: 'Central',
    lat: 7.4675,
    lng: 80.6234,
    popularCities: ['Matale', 'Dambulla', 'Galewela', 'Sigiriya', 'Ukuwela', 'Rattota'],
  },
  Matara: {
    name: 'Matara',
    province: 'Southern',
    lat: 5.9549,
    lng: 80.555,
    popularCities: ['Matara', 'Weligama', 'Akuressa', 'Dikwella', 'Hakmana', 'Kamburupitiya', 'Devinuwara'],
  },
  Monaragala: {
    name: 'Monaragala',
    province: 'Uva',
    lat: 6.8728,
    lng: 81.3507,
    popularCities: ['Monaragala', 'Wellawaya', 'Buttala', 'Bibile', 'Kataragama', 'Siyambalanduwa'],
  },
  Mullaitivu: {
    name: 'Mullaitivu',
    province: 'Northern',
    lat: 9.2671,
    lng: 80.8142,
    popularCities: ['Mullaitivu', 'Puthukkudiyiruppu', 'Oddusuddan', 'Mankulam'],
  },
  'Nuwara Eliya': {
    name: 'Nuwara Eliya',
    province: 'Central',
    lat: 6.9497,
    lng: 80.7891,
    popularCities: ['Nuwara Eliya', 'Hatton', 'Talawakele', 'Ginigathena', 'Walapane', 'Maskeliya'],
  },
  Polonnaruwa: {
    name: 'Polonnaruwa',
    province: 'North Central',
    lat: 7.9403,
    lng: 81.0188,
    popularCities: ['Polonnaruwa', 'Kaduruwela', 'Hingurakgoda', 'Medirigiriya', 'Habarana', 'Minneriya'],
  },
  Puttalam: {
    name: 'Puttalam',
    province: 'North Western',
    lat: 8.0362,
    lng: 79.8283,
    popularCities: ['Puttalam', 'Chilaw', 'Wennappuwa', 'Marawila', 'Anamaduwa', 'Nattandiya', 'Kalpitiya'],
  },
  Ratnapura: {
    name: 'Ratnapura',
    province: 'Sabaragamuwa',
    lat: 6.6828,
    lng: 80.4037,
    popularCities: ['Ratnapura', 'Balangoda', 'Embilipitiya', 'Pelmadulla', 'Kuruwita', 'Eheliyagoda', 'Kalawana'],
  },
  Trincomalee: {
    name: 'Trincomalee',
    province: 'Eastern',
    lat: 8.5874,
    lng: 81.2152,
    popularCities: ['Trincomalee', 'Kinniya', 'Muttur', 'Kantale', 'Nilaveli'],
  },
  Vavuniya: {
    name: 'Vavuniya',
    province: 'Northern',
    lat: 8.7542,
    lng: 80.4982,
    popularCities: ['Vavuniya', 'Nedunkeni', 'Cheddikulam'],
  },
}

export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718]
