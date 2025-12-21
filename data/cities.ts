export interface City {
  name: string;
  slug: string;
}

export interface Country {
  name: string;
  cities: City[];
}

export const citiesData: Country[] = [
  {
    name: "Portugal",
    cities: [
      { name: "Lisbon", slug: "lisbon" },
      { name: "Porto", slug: "porto" },
      { name: "Aveiro", slug: "aveiro" },
      { name: "Seixal", slug: "seixal" },
      { name: "Braga", slug: "braga" },
      { name: "Coimbra", slug: "coimbra" },
      { name: "Cascais", slug: "cascais" },
      { name: "Albufeira", slug: "albufeira" },
    ],
  },
  {
    name: "Spain",
    cities: [
      { name: "Barcelona", slug: "barcelona" },
      { name: "Madrid", slug: "madrid" },
      { name: "Valencia", slug: "valencia" },
      { name: "Seville", slug: "seville" },
      { name: "Málaga", slug: "malaga" },
      { name: "Granada", slug: "granada" },
    ],
  },
  {
    name: "United States",
    cities: [
      { name: "New York", slug: "new-york" },
      { name: "Los Angeles", slug: "los-angeles" },
      { name: "San Francisco", slug: "san-francisco" },
      { name: "Austin", slug: "austin" },
      { name: "Miami", slug: "miami" },
      { name: "Seattle", slug: "seattle" },
      { name: "Boston", slug: "boston" },
      { name: "Denver", slug: "denver" },
      { name: "Portland", slug: "portland" },
      { name: "Chicago", slug: "chicago" },
    ],
  },
  {
    name: "United Kingdom",
    cities: [
      { name: "London", slug: "london" },
      { name: "Manchester", slug: "manchester" },
      { name: "Edinburgh", slug: "edinburgh" },
      { name: "Bristol", slug: "bristol" },
      { name: "Brighton", slug: "brighton" },
      { name: "Liverpool", slug: "liverpool" },
    ],
  },
  {
    name: "Thailand",
    cities: [
      { name: "Bangkok", slug: "bangkok" },
      { name: "Chiang Mai", slug: "chiang-mai" },
      { name: "Phuket", slug: "phuket" },
      { name: "Pattaya", slug: "pattaya" },
      { name: "Krabi", slug: "krabi" },
    ],
  },
  {
    name: "Mexico",
    cities: [
      { name: "Mexico City", slug: "mexico-city" },
      { name: "Playa del Carmen", slug: "playa-del-carmen" },
      { name: "Guadalajara", slug: "guadalajara" },
      { name: "Tulum", slug: "tulum" },
      { name: "Oaxaca", slug: "oaxaca" },
    ],
  },
  {
    name: "Indonesia",
    cities: [
      { name: "Bali", slug: "bali" },
      { name: "Jakarta", slug: "jakarta" },
      { name: "Yogyakarta", slug: "yogyakarta" },
      { name: "Bandung", slug: "bandung" },
    ],
  },
  {
    name: "Vietnam",
    cities: [
      { name: "Ho Chi Minh City", slug: "ho-chi-minh-city" },
      { name: "Hanoi", slug: "hanoi" },
      { name: "Da Nang", slug: "da-nang" },
      { name: "Hoi An", slug: "hoi-an" },
    ],
  },
  {
    name: "Colombia",
    cities: [
      { name: "Medellín", slug: "medellin" },
      { name: "Bogotá", slug: "bogota" },
      { name: "Cartagena", slug: "cartagena" },
      { name: "Santa Marta", slug: "santa-marta" },
    ],
  },
  {
    name: "Germany",
    cities: [
      { name: "Berlin", slug: "berlin" },
      { name: "Munich", slug: "munich" },
      { name: "Hamburg", slug: "hamburg" },
      { name: "Frankfurt", slug: "frankfurt" },
      { name: "Cologne", slug: "cologne" },
    ],
  },
  {
    name: "France",
    cities: [
      { name: "Paris", slug: "paris" },
      { name: "Lyon", slug: "lyon" },
      { name: "Marseille", slug: "marseille" },
      { name: "Bordeaux", slug: "bordeaux" },
      { name: "Nice", slug: "nice" },
    ],
  },
  {
    name: "Italy",
    cities: [
      { name: "Rome", slug: "rome" },
      { name: "Milan", slug: "milan" },
      { name: "Florence", slug: "florence" },
      { name: "Venice", slug: "venice" },
      { name: "Naples", slug: "naples" },
    ],
  },
  {
    name: "Netherlands",
    cities: [
      { name: "Amsterdam", slug: "amsterdam" },
      { name: "Rotterdam", slug: "rotterdam" },
      { name: "The Hague", slug: "the-hague" },
      { name: "Utrecht", slug: "utrecht" },
    ],
  },
  {
    name: "Canada",
    cities: [
      { name: "Toronto", slug: "toronto" },
      { name: "Vancouver", slug: "vancouver" },
      { name: "Montreal", slug: "montreal" },
      { name: "Calgary", slug: "calgary" },
      { name: "Ottawa", slug: "ottawa" },
    ],
  },
  {
    name: "Australia",
    cities: [
      { name: "Sydney", slug: "sydney" },
      { name: "Melbourne", slug: "melbourne" },
      { name: "Brisbane", slug: "brisbane" },
      { name: "Perth", slug: "perth" },
      { name: "Adelaide", slug: "adelaide" },
    ],
  },
  {
    name: "Japan",
    cities: [
      { name: "Tokyo", slug: "tokyo" },
      { name: "Osaka", slug: "osaka" },
      { name: "Kyoto", slug: "kyoto" },
      { name: "Fukuoka", slug: "fukuoka" },
      { name: "Sapporo", slug: "sapporo" },
    ],
  },
  {
    name: "Brazil",
    cities: [
      { name: "São Paulo", slug: "sao-paulo" },
      { name: "Rio de Janeiro", slug: "rio-de-janeiro" },
      { name: "Florianópolis", slug: "florianopolis" },
      { name: "Brasília", slug: "brasilia" },
    ],
  },
  {
    name: "Argentina",
    cities: [
      { name: "Buenos Aires", slug: "buenos-aires" },
      { name: "Córdoba", slug: "cordoba" },
      { name: "Mendoza", slug: "mendoza" },
    ],
  },
  {
    name: "Poland",
    cities: [
      { name: "Warsaw", slug: "warsaw" },
      { name: "Krakow", slug: "krakow" },
      { name: "Wroclaw", slug: "wroclaw" },
      { name: "Gdansk", slug: "gdansk" },
    ],
  },
  {
    name: "Czech Republic",
    cities: [
      { name: "Prague", slug: "prague" },
      { name: "Brno", slug: "brno" },
      { name: "Ostrava", slug: "ostrava" },
    ],
  },
];
