// Estoque extraído da "Tabela de Veículos Disponíveis (3).pdf". Dados ausentes permanecem nulos.
const rows = [
  ["Land Rover","Discovery Sport 2.0 SE 4x4 Diesel Automática (Teto Solar Panorâmico)",2021,152900,189357,"suv"],
  ["Honda","Civic Sport 2.0 Manual",2018,79900,100186,"sedan"],
  ["Mercedes-Benz","E-250 Avantgarde 2.0 Gasolina Automática",2017,108900,155017,"sedan"],
  ["Mercedes-Benz","GLA 200 Advance 1.6 Flex Automático",2017,82900,104699,"suv"],
  ["Fiat","Strada Freedom 1.3 Flex Manual",2024,74900,90435,"picape"],
  ["Mercedes-Benz","C-180 Kompressor Classic 1.8 Automático",2003,33900,43971,"sedan"],
  ["Nissan","Livina SL 1.8 Flex Automática",2010,23900,32863,"minivan"],
  ["Ford","EcoSport XLT 2.0 Flex Automática",2007,19900,29231,"suv"],
  ["Ford","Fiesta Sedan 1.0 Flex Manual",2008,12900,20282,"sedan"],
  ["Renault","Kwid Zen 1.0 Flex Manual",2022,30900,44728,"hatch"],
  ["BMW","X5 Full xDrive 35i V6 Gasolina 3.0 Bi-Turbo Teto Solar Panorâmico",2017,119900,167432,"suv"],
  ["Fiat","Toro Freedom 2.0 4x2 Diesel Manual",2017,67900,81490,"picape"],
  ["Chevrolet","Monza Club 2.0 Manual",1994,9900,15331,"sedan"],
  ["Chevrolet","Onix Hatch LT 1.0 Flex Manual",2025,63900,73211,"hatch"],
  ["Chevrolet","Onix LT 1.0 Flex Manual",2019,33900,54000,"hatch"],
  ["Chevrolet","Tracker LTZ 1.0 Turbo Flex Automático",2025,99900,117193,"suv"],
  ["Kia","Sportage EX2 2.0 Flex Automática",2018,96900,108807,"suv"],
  ["Renault","Scenic Privilège 2.0 Gasolina Manual",2006,10900,18098,"minivan"],
  ["Citroën","C4 Pallas Exclusive 2.0 Flex Automático",2010,16900,26093,"sedan"],
  ["Fiat","Mobi Like 1.0 Fire Flex Manual",2023,43900,53768,"hatch"],
  ["Suzuki","Grand Vitara 2.0 Automática",2012,39900,49666,"suv"],
  ["Peugeot","2008 Crossway 1.6 Automático",2019,58900,67341,"suv"],
  ["Chevrolet","Spin LT 1.8 Flex Manual",2020,32900,57801,"minivan"],
  ["Ford","Ka GL 1.0 Gasolina Manual",2004,7900,13146,"hatch"],
  ["Fiat","Uno Mille Way Economy 1.0 Flex Manual",2010,17900,26534,"hatch"],
  ["Volkswagen","Voyage 1.0 Flex Manual",2012,24900,33033,"sedan"],
  ["Toyota","RAV4 2.4 4x4 Automática (com teto solar)",2011,49900,58190,"suv"],
  ["Kia","Sportage EX3 2.0 Flex Automática (com teto solar duplo)",2012,44900,66093,"suv"],
  ["Volkswagen","Polo MSI 1.6 Flex Manual",2018,49900,61361,"hatch"],
  ["BMW","116iA 1.6 TB 136CV Gasolina Automática",2014,53900,68533,"hatch"],
  ["Hyundai","VeraCruz GLS 3.8 V6 4WD Gasolina Automática (teto solar + 7 lugares)",2010,33900,50923,"suv"],
  ["Mitsubishi","L200 Triton GLX 2.4 CD 4x4 Diesel Manual",2022,111900,124222,"picape"],
  ["Peugeot","207 XS 1.6 Flex Automático",2009,15900,20892,"hatch"],
  ["Ford","Fiesta 1.6 Flex Manual (leilão Detran)",2012,19900,30866,"hatch"],
  ["Ford","Ka GL 1.0 Gasolina Manual",2004,6900,13146,"hatch"],
  ["Volkswagen","Santana Mi 2.0 Gasolina Manual",2005,18900,27640,"sedan"],
  ["Volkswagen","Jetta 2.5 Automático Gasolina (teto solar)",2008,27900,38115,"sedan"],
  ["Hyundai","Tucson GLS Turbo 1.6 Automática (teto solar panorâmico)",2018,72900,94584,"suv"],
  ["Honda","CB Twister 250cc",2019,14900,17798,"moto"],
  ["Peugeot","307 1.6 Manual (teto solar)",2009,13900,23345,"hatch"]
];

const slugify = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

window.INITIAL_INVENTORY = rows.map(([brand,model,year,price,fipe,body],index)=>({
  id:`pdf-${String(index+1).padStart(2,"0")}`,slug:`${slugify(`${brand}-${model}-${year}`)}-${index+1}`,
  brand,model,version:null,manufacture_year:year,model_year:year,year,price,fipe_price:fipe,
  mileage:null,fuel:null,transmission:null,body_type:body,body,description:null,vehicle_images:[],
  featured:index<6,published:true,status:"available",created_at:new Date(2026,7,13,12,index).toISOString()
}));
