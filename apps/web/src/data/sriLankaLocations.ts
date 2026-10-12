export interface SriLankaCity {
  name: string
  center?: [number, number]
  zoom?: number
}

export interface SriLankaDistrict {
  name: string
  center?: [number, number]
  zoom?: number
  cities: SriLankaCity[]
}

export interface SriLankaProvince {
  name: string
  center?: [number, number]
  zoom?: number
  districts: SriLankaDistrict[]
}

const district = (
  name: string,
  center: [number, number],
  cities: string[],
): SriLankaDistrict => ({
  name,
  center,
  zoom: 9,
  cities: cities.map((city) => ({ name: city })),
})

export const SRI_LANKA_LOCATIONS: SriLankaProvince[] = [
  {
    name: 'Central',
    center: [7.2906, 80.6337],
    zoom: 9,
    districts: [
      district('Kandy', [7.2906, 80.6337], [
        'Kandy',
        'Peradeniya',
        'Katugastota',
      ]),
      district('Matale', [7.4675, 80.6234], [
        'Matale',
        'Dambulla',
        'Sigiriya',
      ]),
      district('Nuwara Eliya', [6.9497, 80.7891], [
        'Nuwara Eliya',
        'Hatton',
        'Talawakele',
      ]),
    ],
  },
  {
    name: 'Eastern',
    center: [7.731, 81.6747],
    zoom: 9,
    districts: [
      district('Ampara', [7.2917, 81.6726], [
        'Ampara',
        'Kalmunai',
        'Akkaraipattu',
      ]),
      district('Batticaloa', [7.717, 81.7], [
        'Batticaloa',
        'Kattankudy',
        'Eravur',
      ]),
      district('Trincomalee', [8.5874, 81.2152], [
        'Trincomalee',
        'Kinniya',
        'Kantale',
      ]),
    ],
  },
  {
    name: 'North Central',
    center: [8.3114, 80.4037],
    zoom: 9,
    districts: [
      district('Anuradhapura', [8.3114, 80.4037], [
        'Anuradhapura',
        'Kekirawa',
        'Medawachchiya',
      ]),
      district('Polonnaruwa', [7.9403, 81.0188], [
        'Polonnaruwa',
        'Kaduruwela',
        'Hingurakgoda',
      ]),
    ],
  },
  {
    name: 'North Western',
    center: [7.4863, 80.3647],
    zoom: 9,
    districts: [
      district('Kurunegala', [7.4863, 80.3647], [
        'Kurunegala',
        'Kuliyapitiya',
        'Narammala',
      ]),
      district('Puttalam', [8.0362, 79.8283], [
        'Puttalam',
        'Chilaw',
        'Wennappuwa',
      ]),
    ],
  },
  {
    name: 'Northern',
    center: [9.6615, 80.0255],
    zoom: 9,
    districts: [
      district('Jaffna', [9.6615, 80.0255], [
        'Jaffna',
        'Chavakachcheri',
        'Point Pedro',
      ]),
      district('Kilinochchi', [9.3803, 80.377], [
        'Kilinochchi',
        'Pallai',
        'Poonakary',
      ]),
      district('Mannar', [8.981, 79.9044], [
        'Mannar',
        'Madhu',
        'Nanaddan',
      ]),
      district('Mullaitivu', [9.2671, 80.8128], [
        'Mullaitivu',
        'Puthukkudiyiruppu',
        'Oddusuddan',
      ]),
      district('Vavuniya', [8.7514, 80.4971], [
        'Vavuniya',
        'Nedunkeni',
        'Vengalacheddikulam',
      ]),
    ],
  },
  {
    name: 'Sabaragamuwa',
    center: [6.7056, 80.3847],
    zoom: 9,
    districts: [
      district('Kegalle', [7.2513, 80.3464], [
        'Kegalle',
        'Mawanella',
        'Warakapola',
      ]),
      district('Ratnapura', [6.7056, 80.3847], [
        'Ratnapura',
        'Balangoda',
        'Embilipitiya',
      ]),
    ],
  },
  {
    name: 'Southern',
    center: [6.0329, 80.2168],
    zoom: 9,
    districts: [
      district('Galle', [6.0329, 80.2168], [
        'Galle',
        'Ambalangoda',
        'Hikkaduwa',
      ]),
      district('Hambantota', [6.1241, 81.1185], [
        'Hambantota',
        'Tangalle',
        'Tissamaharama',
      ]),
      district('Matara', [5.9549, 80.555], [
        'Matara',
        'Weligama',
        'Akuressa',
      ]),
    ],
  },
  {
    name: 'Uva',
    center: [6.9847, 81.056],
    zoom: 9,
    districts: [
      district('Badulla', [6.9934, 81.055], [
        'Badulla',
        'Bandarawela',
        'Haputale',
      ]),
      district('Monaragala', [6.8714, 81.3487], [
        'Monaragala',
        'Wellawaya',
        'Bibile',
      ]),
    ],
  },
  {
    name: 'Western',
    center: [6.9271, 79.8612],
    zoom: 9,
    districts: [
      district('Colombo', [6.9271, 79.8612], [
        'Colombo',
        'Dehiwala-Mount Lavinia',
        'Maharagama',
      ]),
      district('Gampaha', [7.084, 80.0098], [
        'Gampaha',
        'Negombo',
        'Wattala',
      ]),
      district('Kalutara', [6.5854, 79.9607], [
        'Kalutara',
        'Panadura',
        'Beruwala',
      ]),
    ],
  },
]
