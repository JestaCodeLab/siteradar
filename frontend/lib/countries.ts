/** Search Console reports countries as three-letter codes. The common ones are named here; anything else shows its code. */
const NAMES: Record<string, string> = {
  afg: "Afghanistan", alb: "Albania", dza: "Algeria", ago: "Angola", arg: "Argentina", arm: "Armenia", aus: "Australia", aut: "Austria", aze: "Azerbaijan", bhr: "Bahrain",
  bgd: "Bangladesh", blr: "Belarus", bel: "Belgium", ben: "Benin", bol: "Bolivia", bih: "Bosnia and Herzegovina", bwa: "Botswana", bra: "Brazil", bgr: "Bulgaria",
  bfa: "Burkina Faso", bdi: "Burundi", khm: "Cambodia", cmr: "Cameroon", can: "Canada", tcd: "Chad", chl: "Chile", chn: "China", col: "Colombia", cog: "Congo",
  cod: "DR Congo", cri: "Costa Rica", civ: "Côte d'Ivoire", hrv: "Croatia", cub: "Cuba", cyp: "Cyprus", cze: "Czechia", dnk: "Denmark", dom: "Dominican Republic",
  ecu: "Ecuador", egy: "Egypt", slv: "El Salvador", eri: "Eritrea", est: "Estonia", eth: "Ethiopia", fin: "Finland", fra: "France", gab: "Gabon", gmb: "Gambia",
  geo: "Georgia", deu: "Germany", gha: "Ghana", grc: "Greece", gtm: "Guatemala", gin: "Guinea", hti: "Haiti", hnd: "Honduras", hkg: "Hong Kong", hun: "Hungary",
  isl: "Iceland", ind: "India", idn: "Indonesia", irn: "Iran", irq: "Iraq", irl: "Ireland", isr: "Israel", ita: "Italy", jam: "Jamaica", jpn: "Japan", jor: "Jordan",
  kaz: "Kazakhstan", ken: "Kenya", kwt: "Kuwait", lva: "Latvia", lbn: "Lebanon", lso: "Lesotho", lbr: "Liberia", lby: "Libya", ltu: "Lithuania", lux: "Luxembourg",
  mdg: "Madagascar", mwi: "Malawi", mys: "Malaysia", mli: "Mali", mlt: "Malta", mrt: "Mauritania", mus: "Mauritius", mex: "Mexico", mda: "Moldova", mng: "Mongolia",
  mar: "Morocco", moz: "Mozambique", mmr: "Myanmar", nam: "Namibia", npl: "Nepal", nld: "Netherlands", nzl: "New Zealand", nic: "Nicaragua", ner: "Niger", nga: "Nigeria",
  nor: "Norway", omn: "Oman", pak: "Pakistan", pan: "Panama", pry: "Paraguay", per: "Peru", phl: "Philippines", pol: "Poland", prt: "Portugal", qat: "Qatar", rou: "Romania",
  rus: "Russia", rwa: "Rwanda", sau: "Saudi Arabia", sen: "Senegal", srb: "Serbia", sle: "Sierra Leone", sgp: "Singapore", svk: "Slovakia", svn: "Slovenia", som: "Somalia",
  zaf: "South Africa", kor: "South Korea", ssd: "South Sudan", esp: "Spain", lka: "Sri Lanka", sdn: "Sudan", swe: "Sweden", che: "Switzerland", syr: "Syria", twn: "Taiwan",
  tza: "Tanzania", tha: "Thailand", tgo: "Togo", tto: "Trinidad and Tobago", tun: "Tunisia", tur: "Türkiye", uga: "Uganda", ukr: "Ukraine", are: "United Arab Emirates",
  gbr: "United Kingdom", usa: "United States", ury: "Uruguay", uzb: "Uzbekistan", ven: "Venezuela", vnm: "Vietnam", yem: "Yemen", zmb: "Zambia", zwe: "Zimbabwe",
};

export const countryName = (code: string) => NAMES[code.toLowerCase()] ?? code.toUpperCase();
